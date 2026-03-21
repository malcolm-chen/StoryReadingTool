-- public.users_id_seq
CREATE SEQUENCE public.users_id_seq
  AS integer
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 2147483647
  CACHE 1
  NO CYCLE;

-- public.users
CREATE TABLE public.users (
  id integer NOT NULL DEFAULT nextval('public.users_id_seq'::regclass),
  username character varying(512) NOT NULL,
  password text NOT NULL,
  current_book text NULL,
  current_page text NULL,
  asked_questions jsonb NOT NULL DEFAULT '{}'::jsonb,
  chat_history jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Unique index on username
CREATE UNIQUE INDEX ix_users_username
  ON public.users USING btree (username);

-- Sequence ownership (matches current DB)
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;