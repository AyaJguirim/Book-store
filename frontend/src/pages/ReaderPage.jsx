// frontend/src/pages/ReaderPage.jsx
// Lecteur PDF intégré : affiche une page à la fois et mémorise la dernière page lue.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import Loader from "../components/common/Loader";
import ErrorMessage from "../components/common/ErrorMessage";
import { useBook } from "../hooks/useBook";
import { getBookPdf } from "../services/readerService";
import {
  getReadingProgress,
  saveReadingProgress,
  saveReadingProgressOnExit,
} from "../services/readingProgressService";
import { isCanceled } from "../services/api";
import { getErrorMessage } from "../utils/getErrorMessage";

// Le travail de décodage du PDF se fait dans un "worker" (un fil séparé du navigateur)
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const SAVE_DELAY = 800; // ms d'attente après le dernier changement de page
const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2, 3];

// `key={id}` (voir plus bas) remonte ce composant à chaque nouveau livre : les états repartent de zéro
function Reader({ id }) {
  const { book, loading: bookLoading, error: bookError } = useBook(id);

  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoomIndex, setZoomIndex] = useState(1);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [renderError, setRenderError] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saved | error
  const [containerWidth, setContainerWidth] = useState(0);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const pendingSave = useRef(null); // { page, total } en attente d'envoi
  const saveTimer = useRef(null);

  const hasPdf = book?.has_pdf === true;

  // ----- 1. Chargement : progression enregistrée + fichier PDF -----
  useEffect(() => {
    if (!hasPdf) return;

    const controller = new AbortController();
    let loadingTask = null;
    let cancelled = false;

    async function load() {
      try {
        // La progression est facultative : une erreur ici n'empêche pas de lire
        const progressPromise = getReadingProgress(id, {
          signal: controller.signal,
        }).catch(() => null);

        const buffer = await getBookPdf(id, {
          signal: controller.signal,
          onProgress: setDownloadPercent,
        });
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const doc = await loadingTask.promise;
        const progress = await progressPromise;
        if (cancelled) {
          doc.destroy();
          return;
        }

        // Reprise : on repart de la dernière page lue (sans dépasser la fin du livre)
        const startPage = progress
          ? Math.min(Math.max(progress.last_page, 1), doc.numPages)
          : 1;

        setNumPages(doc.numPages);
        setPage(startPage);
        setPageInput(String(startPage));
        setPdf(doc);
      } catch (err) {
        if (cancelled || isCanceled(err)) return;
        setLoadError(
          err.response || err.code
            ? getErrorMessage(err)
            : "Ce fichier PDF n'a pas pu être ouvert.",
        );
      }
    }

    load();

    return () => {
      cancelled = true;
      controller.abort();
      if (loadingTask) loadingTask.destroy(); // libère la mémoire et arrête le worker
    };
  }, [id, hasPdf]);

  // ----- 2. Enregistrement de la dernière page (avec un petit délai) -----
  // onExit = true quand la page est en train de se fermer : envoi qui survit à la fermeture
  const flushSave = useCallback(
    (onExit = false) => {
      clearTimeout(saveTimer.current);
      const pending = pendingSave.current;
      if (!pending) return;
      pendingSave.current = null;

      if (onExit) {
        saveReadingProgressOnExit(id, pending.page, pending.total);
        return;
      }

      saveReadingProgress(id, pending.page, pending.total)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
    },
    [id],
  );

  useEffect(() => {
    if (!pdf) return;
    pendingSave.current = { page, total: numPages };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => flushSave(), SAVE_DELAY);
  }, [pdf, page, numPages, flushSave]);

  // En quittant la page ou en changeant d'onglet : on enregistre tout de suite
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave(true);
    };
    const onPageHide = () => flushSave(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      flushSave(); // navigation interne : l'application continue, un envoi normal suffit
    };
  }, [flushSave]);

  // ----- 3. Largeur disponible (le livre s'adapte à l'écran) -----
  useEffect(() => {
    const element = containerRef.current;
    if (!element || !pdf) return;

    const observer = new ResizeObserver(() => {
      setContainerWidth(Math.round(element.clientWidth));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [pdf]);

  // ----- 4. Affichage de la page courante sur le canvas -----
  useEffect(() => {
    if (!pdf || !containerWidth) return;

    let cancelled = false;
    let renderTask = null;

    pdf
      .getPage(page)
      .then((pdfPage) => {
        if (cancelled) return;

        const baseWidth = pdfPage.getViewport({ scale: 1 }).width;
        const cssScale = (containerWidth / baseWidth) * ZOOM_STEPS[zoomIndex];
        const ratio = window.devicePixelRatio || 1; // écrans Retina : image plus nette
        const viewport = pdfPage.getViewport({ scale: cssScale * ratio });

        const canvas = canvasRef.current;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;

        setRenderError(false);
        renderTask = pdfPage.render({
          canvasContext: canvas.getContext("2d"),
          viewport,
        });
        return renderTask.promise;
      })
      .catch((err) => {
        // Une page remplacée par une autre pendant son affichage n'est pas une erreur
        if (err?.name === "RenderingCancelledException") return;
        if (!cancelled) setRenderError(true);
      });

    return () => {
      cancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [pdf, page, zoomIndex, containerWidth]);

  // ----- Navigation -----
  const goToPage = useCallback(
    (target) => {
      const next = Math.min(Math.max(target, 1), numPages);
      setPage(next);
      setPageInput(String(next));
    },
    [numPages],
  );

  // Flèches du clavier (sauf quand on tape dans le champ "numéro de page")
  useEffect(() => {
    if (!pdf) return;
    const onKeyDown = (event) => {
      if (event.target.tagName === "INPUT") return;
      if (event.key === "ArrowRight" || event.key === "PageDown") goToPage(page + 1);
      if (event.key === "ArrowLeft" || event.key === "PageUp") goToPage(page - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pdf, page, goToPage]);

  const submitPageInput = (event) => {
    event.preventDefault();
    const value = Number(pageInput);
    if (Number.isInteger(value)) goToPage(value);
    else setPageInput(String(page));
  };

  // ----- Affichage -----
  const backLink = (
    <Link to={`/livres/${id}`} className="btn btn-link px-0 mb-3">
      ← Retour à la fiche du livre
    </Link>
  );

  if (bookLoading) return <Loader label="Chargement du livre…" />;

  if (bookError) {
    return (
      <div>
        <ErrorMessage message={bookError.message} />
        <div className="text-center">
          <Link to="/" className="btn btn-outline-primary">
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (!hasPdf) {
    return (
      <div>
        {backLink}
        <div className="alert alert-info">
          Ce livre n'est pas encore disponible en lecture en ligne.
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        {backLink}
        <ErrorMessage message={loadError} />
      </div>
    );
  }

  if (!pdf) {
    return (
      <Loader
        label={
          downloadPercent > 0 && downloadPercent < 100
            ? `Chargement du livre… ${downloadPercent} %`
            : "Chargement du livre…"
        }
      />
    );
  }

  const percent = Math.round((page / numPages) * 100);

  return (
    <div>
      {backLink}
      <h1 className="h4 mb-1">{book.title}</h1>
      <p className="text-secondary mb-3">{book.author}</p>

      {/* Barre d'outils : reste visible pendant qu'on fait défiler une grande page */}
      <div className="reader-toolbar d-flex flex-wrap align-items-center gap-2 py-2">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => goToPage(page - 1)}
          disabled={page <= 1}
        >
          ← Précédente
        </button>

        <form className="d-flex align-items-center gap-2" onSubmit={submitPageInput}>
          <label htmlFor="page-input" className="visually-hidden">
            Numéro de page
          </label>
          <input
            id="page-input"
            type="number"
            min="1"
            max={numPages}
            className="form-control form-control-sm reader-page-input"
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onFocus={(event) => event.target.select()}
            onBlur={submitPageInput}
          />
          <span className="text-secondary small">/ {numPages}</span>
        </form>

        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => goToPage(page + 1)}
          disabled={page >= numPages}
        >
          Suivante →
        </button>

        <div className="btn-group btn-group-sm ms-md-auto" role="group" aria-label="Zoom">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setZoomIndex((index) => Math.max(index - 1, 0))}
            disabled={zoomIndex === 0}
            aria-label="Réduire le zoom"
          >
            −
          </button>
          <span className="btn btn-outline-secondary disabled">
            {Math.round(ZOOM_STEPS[zoomIndex] * 100)} %
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setZoomIndex((index) => Math.min(index + 1, ZOOM_STEPS.length - 1))}
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            aria-label="Agrandir le zoom"
          >
            +
          </button>
        </div>
      </div>

      <div
        className="progress my-2"
        role="progressbar"
        aria-label="Avancement de la lecture"
        aria-valuenow={percent}
        aria-valuemin="0"
        aria-valuemax="100"
        style={{ height: 6 }}
      >
        <div className="progress-bar" style={{ width: `${percent}%` }}></div>
      </div>
      <p className="small text-secondary mb-3" aria-live="polite">
        {percent} % lu ·{" "}
        {saveState === "error"
          ? "⚠ Votre progression n'a pas pu être enregistrée."
          : saveState === "saved"
            ? "Progression enregistrée automatiquement."
            : "Votre progression sera enregistrée automatiquement."}
      </p>

      <div ref={containerRef} className="reader-stage">
        {renderError && (
          <div className="alert alert-danger">
            Cette page n'a pas pu être affichée. Essayez une autre page.
          </div>
        )}
        {/* Le canvas reste toujours dans la page : il est simplement masqué en cas d'erreur */}
        <canvas
          ref={canvasRef}
          className={`reader-canvas ${renderError ? "d-none" : ""}`}
          aria-label={`Page ${page} sur ${numPages}`}
        />
      </div>
    </div>
  );
}

function ReaderPage() {
  const { id } = useParams();
  return <Reader key={id} id={id} />;
}

export default ReaderPage;
