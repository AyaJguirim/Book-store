-- Book Store : tables des comptes utilisateurs et de leurs donnees privees
-- A executer APRES schema.sql (la table books doit exister).
-- Re-executable : supprime et recree uniquement ces tables.

drop table if exists reading_progress;
drop table if exists recent_views;
drop table if exists notes;
drop table if exists reading_log;
drop table if exists favorites;
drop table if exists reading_goals;
drop table if exists password_resets;
drop table if exists users;

create table users (
   id            serial primary key,
   name          varchar(100) not null check ( btrim(name) <> '' ),
   email         varchar(254) not null check ( btrim(email) <> '' ),
   password_hash varchar(100) not null,
   role          varchar(20) not null default 'user' check ( role in ( 'user',
                                                              'admin' ) ),
   created_at    timestamp not null default now()
);

-- E-mail unique sans tenir compte des majuscules
create unique index users_email_unique on
   users ( lower(email) );

create table reading_goals (
   user_id integer not null
      references users ( id )
         on delete cascade,
   year    integer not null check ( year between 2000 and 2100 ),
   target  integer not null check ( target between 1 and 1000 ),
   primary key ( user_id,
                 year )
);

create table reading_log (
   user_id     integer not null
      references users ( id )
         on delete cascade,
   book_id     integer not null
      references books ( id )
         on delete cascade,
   status      varchar(20) not null check ( status in ( 'reading',
                                                   'want_to_read',
                                                   'read',
                                                   'abandoned' ) ),
   started_at  date,
   finished_at date,
   updated_at  timestamp not null default now(),
   primary key ( user_id,
                 book_id )
);

create index idx_reading_log_user_status on
   reading_log (
      user_id,
      status
   );

create table favorites (
   user_id    integer not null
      references users ( id )
         on delete cascade,
   book_id    integer not null
      references books ( id )
         on delete cascade,
   created_at timestamp not null default now(),
   primary key ( user_id,
                 book_id )
);

create table notes (
   user_id    integer not null
      references users ( id )
         on delete cascade,
   book_id    integer not null
      references books ( id )
         on delete cascade,
   rating     smallint check ( rating between 1 and 5 ),
   content    text check ( char_length(content) <= 2000 ),
   created_at timestamp not null default now(),
   updated_at timestamp not null default now(),
   primary key ( user_id,
                 book_id ),
  -- Il faut au moins des etoiles ou un commentaire
      check ( rating is not null
          or btrim(coalesce(
         content,
         ''
      )) <> '' )
);

create table recent_views (
   user_id   integer not null
      references users ( id )
         on delete cascade,
   book_id   integer not null
      references books ( id )
         on delete cascade,
   viewed_at timestamp not null default now(),
   primary key ( user_id,
                 book_id )
);

create index idx_recent_views_user_date on
   recent_views (
      user_id,
      viewed_at
   desc );

-- Progression de lecture : derniere page consultee + historique de lecture
create table reading_progress (
   user_id     integer not null
      references users ( id )
         on delete cascade,
   book_id     integer not null
      references books ( id )
         on delete cascade,
   last_page   integer not null check ( last_page >= 1 ),
   total_pages integer check ( total_pages >= 1 ),
   updated_at  timestamp not null default now(),
   primary key ( user_id,
                 book_id )
);

create index idx_reading_progress_user_date on
   reading_progress (
      user_id,
      updated_at
   desc );
-- Réinitialisation du mot de passe : un jeton à usage unique, valable 1 heure.
-- On stocke son empreinte (SHA-256), jamais le jeton lui-même.
CREATE TABLE password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_resets_user ON password_resets(user_id);