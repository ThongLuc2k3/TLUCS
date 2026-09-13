import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { env } from '../config/env.js'

if (!env.databaseUrlDirect) throw new Error('Thiếu DATABASE_URL_DIRECT hoặc DATABASE_URL')
if (!/^[a-z_][a-z0-9_]*$/i.test(env.databaseSchema)) throw new Error('DATABASE_SCHEMA không hợp lệ')

const sql = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
const client = new pg.Client({ connectionString: env.databaseUrlDirect, ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined })
await client.connect()
try {
  await client.query(`create schema if not exists ${env.databaseSchema}`)
  await client.query(`set search_path to ${env.databaseSchema},public`)
  await client.query('create table if not exists _tlucs_migrations(id text primary key,applied_at timestamptz not null default now())')
  const done = await client.query(`select 1 from _tlucs_migrations where id='0001_initial'`)
  if (done.rowCount) console.log(`Schema ${env.databaseSchema} đã được áp dụng trước đó.`)
  else {
    await client.query('begin')
    await client.query(sql)
    await client.query(`insert into _tlucs_migrations(id) values('0001_initial')`)
    await client.query('commit')
    console.log(`Đã tạo schema ${env.databaseSchema} cho TLUCS.`)
  }
  await client.query(`create unique index if not exists transactions_request_unique on transactions(request_id) where request_id is not null`)
  await client.query(`create unique index if not exists transactions_sharing_buyer_unique on transactions(sharing_post_id,payer_id) where sharing_post_id is not null`)
  await client.query(`alter table requests add column if not exists course_name text`)
  await client.query(`alter type transaction_status add value if not exists 'cancelled'`)
  await client.query(`alter table users add column if not exists deleted_at timestamptz`)
  await client.query(`alter table users add column if not exists deleted_by uuid references users(id)`)
  await client.query(`alter table posts add column if not exists deleted_at timestamptz`)
  await client.query(`alter table comments add column if not exists deleted_at timestamptz`)
  await client.query(`alter table requests add column if not exists deleted_at timestamptz`)
  await client.query(`alter table sharing_posts add column if not exists deleted_at timestamptz`)
  await client.query(`alter table users drop constraint if exists users_role_check`)
  await client.query(`alter table users add constraint users_role_check check(role in ('member','moderator','admin','super_admin'))`)
  await client.query(`create table if not exists admin_credentials(user_id uuid primary key references users(id) on delete cascade,password_hash text not null,password_changed_at timestamptz not null default now())`)
  await client.query(`create table if not exists password_credentials(user_id uuid primary key references users(id) on delete cascade,password_hash text not null,password_changed_at timestamptz not null default now())`)
  await client.query(`create table if not exists admin_audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid not null references users(id),action text not null,target_type text not null,target_id text,reason text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now())`)
  await client.query(`create index if not exists admin_audit_created_idx on admin_audit_logs(created_at desc)`)
  await client.query(`update requests set delivery_mode='online',area_label=null,latitude_blurred=null,longitude_blurred=null where delivery_mode<>'online' or area_label is not null or latitude_blurred is not null or longitude_blurred is not null`)
  await client.query(`update appointments set exact_location=null,meeting_url=null where exact_location is not null or meeting_url is not null`)
  await client.query(`alter table requests drop constraint if exists requests_delivery_mode_check`)
  await client.query(`alter table requests alter column delivery_mode set default 'online'`)
  await client.query(`alter table requests add constraint requests_delivery_mode_check check(delivery_mode='online')`)
  await client.query(`create table if not exists post_gifts(id uuid primary key default gen_random_uuid(),post_id uuid not null references posts(id),sender_id uuid not null references users(id),recipient_id uuid not null references users(id),amount_vnd integer not null check(amount_vnd > 0),fee_vnd integer not null default 0,payout_vnd integer not null,created_at timestamptz not null default now())`)
  await client.query(`create index if not exists post_gifts_post_id_idx on post_gifts(post_id)`)
  await client.query(`alter table post_metrics add column if not exists gift_count integer not null default 0`)
  await client.query(`alter table post_metrics add column if not exists gift_total_vnd integer not null default 0`)
  await client.query(`alter table sharing_access_disputes add column if not exists resolution text`)
  await client.query(`alter table sharing_access_disputes add column if not exists resolved_by uuid references users(id)`)
  await client.query(`alter table comments add column if not exists reaction_count integer not null default 0`)
  await client.query(`alter table comments add column if not exists gift_count integer not null default 0`)
  await client.query(`alter table comments add column if not exists gift_total_vnd integer not null default 0`)
  await client.query(`alter table post_gifts add column if not exists comment_id uuid references comments(id)`)
  await client.query(`alter table post_gifts alter column post_id drop not null`)
  await client.query(`alter table post_gifts drop constraint if exists post_gifts_target_check`)
  await client.query(`alter table post_gifts add constraint post_gifts_target_check check(num_nonnulls(post_id,comment_id)=1)`)
  await client.query(`create index if not exists post_gifts_comment_id_idx on post_gifts(comment_id)`)
  await client.query(`create extension if not exists vector`)
  await client.query(`create table if not exists knowledge_chunks(id text primary key,source text not null,title text not null,content text not null,metadata jsonb not null default '{}',content_hash text not null,embedding vector(768) not null,embedding_model text not null,embedded_at timestamptz not null default now())`)
  await client.query(`create index if not exists knowledge_chunks_source_idx on knowledge_chunks(source)`)
  await client.query(`create index if not exists knowledge_chunks_embedding_hnsw_idx on knowledge_chunks using hnsw (embedding vector_cosine_ops)`)
  await client.query(`create table if not exists knowledge_documents(
    id uuid primary key default gen_random_uuid(), source_type text not null, source_id text, title text not null,
    content text not null, preview text, visibility text not null default 'public' check(visibility in ('public','paid_preview','private')),
    contributor_id uuid references users(id) on delete set null, university_id uuid references universities(id), faculty_id uuid references faculties(id), course_id uuid references courses(id),
    term text, provenance text not null, evidence_type text not null default 'community', authority text not null default 'community_contribution',
    confidence numeric(5,4) not null default .85, expires_at timestamptz, status text not null default 'pending' check(status in ('pending','approved','rejected','withdrawn','expired')),
    opt_in boolean not null default false, anonymized boolean not null default false, version integer not null default 1,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(source_type,source_id))`)
  await client.query(`alter table knowledge_chunks add column if not exists document_id uuid references knowledge_documents(id) on delete cascade`)
  await client.query(`alter table knowledge_chunks add column if not exists visibility text not null default 'public'`)
  await client.query(`alter table knowledge_chunks add column if not exists expires_at timestamptz`)
  await client.query(`alter table knowledge_chunks add column if not exists contributor_id uuid references users(id) on delete set null`)
  await client.query(`create table if not exists knowledge_document_versions(id uuid primary key default gen_random_uuid(),document_id uuid not null references knowledge_documents(id) on delete cascade,version integer not null,title text not null,content text not null,metadata jsonb not null default '{}',created_at timestamptz not null default now(),unique(document_id,version))`)
  await client.query(`create table if not exists knowledge_queries(id uuid primary key default gen_random_uuid(),user_id uuid references users(id) on delete set null,query text not null,university_id uuid references universities(id),faculty_id uuid references faculties(id),course_id uuid references courses(id),top_confidence numeric(5,4) not null default 0,matched boolean not null default false,created_at timestamptz not null default now())`)
  await client.query(`create table if not exists knowledge_citations(id uuid primary key default gen_random_uuid(),query_id uuid references knowledge_queries(id) on delete cascade,chunk_id text not null,document_id uuid references knowledge_documents(id) on delete set null,contributor_id uuid references users(id) on delete set null,created_at timestamptz not null default now())`)
  await client.query(`create table if not exists knowledge_feedback(id uuid primary key default gen_random_uuid(),query_id uuid not null references knowledge_queries(id) on delete cascade,user_id uuid references users(id) on delete set null,useful boolean not null,note text,created_at timestamptz not null default now(),unique(query_id,user_id))`)
  await client.query(`create table if not exists knowledge_gaps(id uuid primary key default gen_random_uuid(),normalized_query text not null,example_query text not null,university_id uuid references universities(id),faculty_id uuid references faculties(id),course_id uuid references courses(id),occurrences integer not null default 1,last_asked_at timestamptz not null default now(),status text not null default 'open',unique(normalized_query,university_id,faculty_id,course_id))`)
  await client.query(`alter table user_reputation_stats add column if not exists knowledge_contribution_points integer not null default 0`)
  await client.query(`alter table posts add column if not exists knowledge_opt_in boolean not null default false`)
  await client.query(`alter table posts add column if not exists ai_processing_consent boolean not null default false`)
  await client.query(`alter table sharing_posts add column if not exists knowledge_opt_in boolean not null default false`)
  await client.query(`alter table sharing_posts add column if not exists ai_processing_consent boolean not null default false`)
  await client.query(`alter table comments add column if not exists knowledge_opt_in boolean not null default false`)
  await client.query(`alter table comments add column if not exists ai_processing_consent boolean not null default false`)
  await client.query(`create table if not exists session_knowledge_consents(request_id uuid not null references requests(id) on delete cascade,user_id uuid not null references users(id) on delete cascade,summary text not null,opt_in boolean not null,ai_processing_consent boolean not null default false,anonymized boolean not null default true,created_at timestamptz not null default now(),primary key(request_id,user_id))`)
  await client.query(`alter table session_knowledge_consents add column if not exists ai_processing_consent boolean not null default false`)
  await client.query(`create index if not exists knowledge_documents_context_idx on knowledge_documents(university_id,faculty_id,course_id,status)`)
  await client.query(`create index if not exists knowledge_queries_created_idx on knowledge_queries(created_at desc)`)
  await client.query(`create table if not exists payout_accounts (
    id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id) on delete cascade,
    bank_code text not null,bank_name text not null,account_number_encrypted text not null,account_number_hash text not null,
    account_last4 text not null,account_name text not null,is_default boolean not null default true,
    created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,account_number_hash))`)
  await client.query(`create unique index if not exists payout_accounts_one_default on payout_accounts(user_id) where is_default`)
  await client.query(`create table if not exists wallet_cash_requests (
    id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id),kind text not null check(kind in ('topup','withdrawal')),
    amount_vnd integer not null check(amount_vnd between 10000 and 10000000),code text not null unique,
    status text not null default 'pending' check(status in ('pending','processing','approved','paid','rejected','cancelled')),
    payout_account_id uuid references payout_accounts(id),bank_reference text unique,actual_amount_vnd integer,sender_name text,
    review_note text,reviewed_by uuid references users(id),reviewed_at timestamptz,ledger_entry_id uuid unique references ledger_entries(id),
    created_at timestamptz not null default now(),updated_at timestamptz not null default now())`)
  await client.query(`create index if not exists wallet_cash_requests_queue_idx on wallet_cash_requests(status,kind,created_at)`)
} catch (error) {
  await client.query('rollback')
  throw error
} finally { await client.end() }
