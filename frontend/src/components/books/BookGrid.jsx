import BookCard from "./BookCard";

function BookGrid({ books }) {
  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xxl-4 g-4">
      {books.map((book) => (
        <div className="col" key={book.id}>
          <BookCard book={book} />
        </div>
      ))}
    </div>
  );
}

export default BookGrid;
