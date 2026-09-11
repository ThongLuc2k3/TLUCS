CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TYPE account_kind AS ENUM ('university_student','high_school_student','alumni','explorer');
CREATE TYPE verification_status AS ENUM ('pending','approved','rejected','revoked');
CREATE TYPE request_kind AS ENUM ('free','paid','exchange');
CREATE TYPE request_status AS ENUM ('draft','moderation','open','matched','scheduled','completed','cancelled','disputed');
CREATE TYPE application_status AS ENUM ('queued','accepted','rejected','withdrawn');
CREATE TYPE transaction_status AS ENUM ('pending','held','released','refunded','partially_refunded','disputed','cancelled');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  real_name text,
  display_name text NOT NULL,
  avatar_url text,
  account_kind account_kind NOT NULL DEFAULT 'explorer',
  default_university_id uuid,
  area_label text,
  latitude_blurred numeric(9,6),
  longitude_blurred numeric(9,6),
  onboarding_completed boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'member' CHECK(role IN ('member','moderator','admin')),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL, provider_account_id text NOT NULL, provider_email text,
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,provider_account_id)
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text UNIQUE NOT NULL, user_agent text, ip_address inet,
  expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL,
  name text NOT NULL, slug text UNIQUE NOT NULL, logo_url text,
  status text NOT NULL DEFAULT 'active', is_pilot boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD CONSTRAINT users_default_university_fk FOREIGN KEY (default_university_id) REFERENCES universities(id);
CREATE TABLE campuses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), university_id uuid NOT NULL REFERENCES universities(id), name text NOT NULL, address text, latitude numeric(9,6), longitude numeric(9,6));
CREATE TABLE faculties (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), university_id uuid NOT NULL REFERENCES universities(id), name text NOT NULL, UNIQUE(university_id,name));
CREATE TABLE courses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), university_id uuid NOT NULL REFERENCES universities(id), faculty_id uuid REFERENCES faculties(id), code text, name text NOT NULL, UNIQUE(university_id,code));

CREATE TABLE university_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), university_id uuid NOT NULL REFERENCES universities(id),
  relation text NOT NULL DEFAULT 'student', verification_status verification_status,
  verified_at timestamptz, UNIQUE(user_id,university_id)
);
CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text UNIQUE NOT NULL,
  name text NOT NULL, category text NOT NULL, active boolean NOT NULL DEFAULT true
);
CREATE TABLE user_topics (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id), PRIMARY KEY(user_id,topic_id)
);
CREATE TABLE user_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  start_time time NOT NULL, end_time time NOT NULL, timezone text NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  CHECK(start_time < end_time)
);
CREATE TABLE user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_university_id uuid REFERENCES universities(id),
  tab_filters jsonb NOT NULL DEFAULT '{}',
  notification_preferences jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_reputation_stats (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  completed_requests integer NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  average_rating numeric(3,2),
  punctuality_rate numeric(5,4), cancellation_rate numeric(5,4), no_show_rate numeric(5,4),
  sharing_host_rating numeric(3,2), sharing_unlock_count integer NOT NULL DEFAULT 0,
  average_response_minutes integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
  event_type text NOT NULL, source_type text NOT NULL, source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}', occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), university_id uuid REFERENCES universities(id), course_id uuid REFERENCES courses(id),
  evidence_type text NOT NULL, evidence_url text NOT NULL, status verification_status NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES users(id), review_note text, created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);

CREATE TABLE community_servers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), university_id uuid UNIQUE NOT NULL REFERENCES universities(id), name text NOT NULL, slug text UNIQUE NOT NULL);
CREATE TABLE channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), server_id uuid REFERENCES community_servers(id),
  name text NOT NULL, slug text NOT NULL, description text, kind text NOT NULL DEFAULT 'chat',
  is_default boolean NOT NULL DEFAULT false, created_by uuid REFERENCES users(id), position integer NOT NULL DEFAULT 0,
  UNIQUE(server_id,slug)
);
CREATE TABLE channel_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), server_id uuid NOT NULL REFERENCES community_servers(id),
  proposer_id uuid NOT NULL REFERENCES users(id), name text NOT NULL, description text NOT NULL,
  status text NOT NULL DEFAULT 'pending', reviewer_id uuid REFERENCES users(id), review_note text,
  created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
CREATE TABLE posts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), author_id uuid NOT NULL REFERENCES users(id), server_id uuid REFERENCES community_servers(id), title text, body text NOT NULL, moderation_status text NOT NULL DEFAULT 'screening', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE post_topics (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id), PRIMARY KEY(post_id,topic_id)
);
CREATE TABLE post_keywords (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  keyword text NOT NULL, PRIMARY KEY(post_id,keyword)
);
CREATE TABLE post_metrics (
  post_id uuid PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  view_count integer NOT NULL DEFAULT 0, reaction_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0, save_count integer NOT NULL DEFAULT 0,
  trending_score numeric(12,4) NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id), parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL, moderation_status text NOT NULL DEFAULT 'screening', created_at timestamptz NOT NULL DEFAULT now(), edited_at timestamptz
);
CREATE TABLE reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
  target_type text NOT NULL CHECK(target_type IN ('post','comment')), target_id uuid NOT NULL,
  reaction text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,target_type,target_id)
);
CREATE TABLE saved_posts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,post_id)
);
CREATE TABLE post_follows (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,post_id)
);
CREATE TABLE post_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  kind text NOT NULL, url text NOT NULL, alt_text text, position smallint NOT NULL DEFAULT 0
);

CREATE TABLE requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), parent_request_id uuid REFERENCES requests(id), author_id uuid NOT NULL REFERENCES users(id), university_id uuid REFERENCES universities(id), course_id uuid REFERENCES courses(id),
  course_name text, kind request_kind NOT NULL, status request_status NOT NULL DEFAULT 'moderation', title text NOT NULL, description text NOT NULL,
  offered_description text, amount_vnd integer CHECK(amount_vnd IS NULL OR (amount_vnd BETWEEN 10000 AND 200000 AND amount_vnd % 1000 = 0)),
  deposit_vnd integer NOT NULL DEFAULT 0 CHECK(deposit_vnd >= 0),
  duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 15 AND 240),
  delivery_mode text NOT NULL DEFAULT 'online' CHECK(delivery_mode = 'online'), area_label text, latitude_blurred numeric(9,6), longitude_blurred numeric(9,6),
  starts_at timestamptz NOT NULL, instant_match boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN requests.starts_at IS 'API bắt buộc nằm trong [server_now + 30 phút, server_now + 3 ngày] tại thời điểm đăng';
CREATE TABLE request_requirements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE, key text NOT NULL, value jsonb NOT NULL, required boolean NOT NULL DEFAULT true);
CREATE TABLE applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests(id), applicant_id uuid NOT NULL REFERENCES users(id), match_score numeric(5,2), missing_requirements jsonb NOT NULL DEFAULT '[]', status application_status NOT NULL DEFAULT 'queued', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(request_id,applicant_id));
CREATE TABLE matches (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid UNIQUE NOT NULL REFERENCES requests(id), receiver_id uuid NOT NULL REFERENCES users(id), matched_at timestamptz NOT NULL DEFAULT now(), exact_match boolean NOT NULL);
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid UNIQUE NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  exact_location text, meeting_url text, status text NOT NULL DEFAULT 'scheduled',
  completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(ends_at > starts_at)
);
CREATE TABLE attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id), event_type text NOT NULL CHECK(event_type IN ('check_in','check_out','no_show_report')),
  note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE match_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests(id),
  user_id uuid REFERENCES users(id), event_type text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL, request_id uuid REFERENCES requests(id), channel_id uuid REFERENCES channels(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE conversation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sender_id uuid NOT NULL REFERENCES users(id),
  recipient_id uuid NOT NULL REFERENCES users(id), intro_message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(), responded_at timestamptz,
  CHECK(sender_id <> recipient_id)
);
CREATE TABLE user_blocks (
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hide_public_content boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(blocker_id,blocked_id),
  CHECK(blocker_id <> blocked_id)
);
CREATE TABLE conversation_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id), mode text NOT NULL DEFAULT 'admin_relay' CHECK(mode IN ('muted','admin_relay')),
  reason text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), ended_at timestamptz
);
CREATE TABLE conversation_members (conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE, user_id uuid REFERENCES users(id), joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(conversation_id,user_id));
CREATE TABLE messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL DEFAULT 'text', body text, attachment_url text, created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE wallets (user_id uuid PRIMARY KEY REFERENCES users(id), available_vnd bigint NOT NULL DEFAULT 0, pending_vnd bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid REFERENCES requests(id), sharing_post_id uuid,
  payer_id uuid NOT NULL REFERENCES users(id), payee_id uuid REFERENCES users(id),
  gross_vnd integer NOT NULL, deposit_vnd integer NOT NULL DEFAULT 0, remaining_vnd integer NOT NULL,
  fee_vnd integer NOT NULL DEFAULT 0, status transaction_status NOT NULL DEFAULT 'pending',
  payment_due_at timestamptz, held_at timestamptz, release_after timestamptz,
  completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(gross_vnd = deposit_vnd + remaining_vnd)
);
CREATE TABLE ledger_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid REFERENCES transactions(id), user_id uuid REFERENCES users(id), direction text NOT NULL CHECK(direction IN ('credit','debit')), amount_vnd integer NOT NULL CHECK(amount_vnd > 0), entry_type text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_code text NOT NULL, bank_name text NOT NULL, account_number_encrypted text NOT NULL,
  account_number_hash text NOT NULL, account_last4 text NOT NULL, account_name text NOT NULL,
  is_default boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,account_number_hash)
);
CREATE UNIQUE INDEX payout_accounts_one_default ON payout_accounts(user_id) WHERE is_default;
CREATE TABLE wallet_cash_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL CHECK(kind IN ('topup','withdrawal')),
  amount_vnd integer NOT NULL CHECK(amount_vnd BETWEEN 10000 AND 10000000), code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','approved','paid','rejected','cancelled')),
  payout_account_id uuid REFERENCES payout_accounts(id), bank_reference text UNIQUE, actual_amount_vnd integer,
  sender_name text, review_note text, reviewed_by uuid REFERENCES users(id), reviewed_at timestamptz,
  ledger_entry_id uuid UNIQUE REFERENCES ledger_entries(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX wallet_cash_requests_queue_idx ON wallet_cash_requests(status,kind,created_at);
CREATE UNIQUE INDEX transactions_request_unique ON transactions(request_id) WHERE request_id IS NOT NULL;
CREATE UNIQUE INDEX transactions_sharing_buyer_unique ON transactions(sharing_post_id,payer_id) WHERE sharing_post_id IS NOT NULL;
CREATE TABLE reviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES requests(id), reviewer_id uuid NOT NULL REFERENCES users(id), reviewee_id uuid NOT NULL REFERENCES users(id), rating smallint NOT NULL CHECK(rating BETWEEN 1 AND 5), comment text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(request_id,reviewer_id));
CREATE TABLE reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL REFERENCES users(id), target_type text NOT NULL, target_id uuid NOT NULL, reason text NOT NULL, status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL, title text NOT NULL, body text NOT NULL, action_url text,
  read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text UNIQUE NOT NULL, p256dh text NOT NULL, auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE moderation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), target_type text NOT NULL, target_id uuid NOT NULL,
  rules_version text NOT NULL, ai_provider text, ai_model text,
  outcome text NOT NULL CHECK(outcome IN ('publish','hold','priority_hold','reject')),
  confidence numeric(5,4), provider_failed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE moderation_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES moderation_runs(id) ON DELETE CASCADE,
  source text NOT NULL CHECK(source IN ('rule','ai','file_scan')),
  code text NOT NULL, severity text NOT NULL, explanation text, evidence jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE moderation_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES moderation_runs(id),
  reviewer_id uuid NOT NULL REFERENCES users(id), decision text NOT NULL,
  note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sharing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), host_id uuid NOT NULL REFERENCES users(id),
  university_id uuid REFERENCES universities(id), course_id uuid REFERENCES courses(id),
  conversation_id uuid UNIQUE REFERENCES conversations(id),
  format text NOT NULL CHECK(format IN ('instant_unlock','scheduled_exchange')),
  title text NOT NULL, description text NOT NULL, deliverables text,
  content_format text, preview_url text, content_extent text,
  refund_terms text, content_updated_at timestamptz,
  proof_note text, access_price_vnd integer NOT NULL DEFAULT 0 CHECK(access_price_vnd >= 0),
  price_review_required boolean GENERATED ALWAYS AS (access_price_vnd > 20000) STORED,
  external_content_detected boolean NOT NULL DEFAULT false,
  host_deposit_vnd integer NOT NULL DEFAULT 0 CHECK(host_deposit_vnd >= 0),
  minimum_participants integer CHECK(minimum_participants IS NULL OR minimum_participants > 0),
  capacity integer CHECK(capacity IS NULL OR capacity > 0),
  registration_deadline timestamptz, status text NOT NULL DEFAULT 'moderation', starts_at timestamptz,
  closes_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(capacity IS NULL OR minimum_participants IS NULL OR minimum_participants <= capacity)
);
ALTER TABLE transactions ADD CONSTRAINT transactions_sharing_post_fk FOREIGN KEY (sharing_post_id) REFERENCES sharing_posts(id);
CREATE TABLE sharing_cancellation_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id),
  recipient_id uuid NOT NULL REFERENCES users(id), amount_vnd integer NOT NULL CHECK(amount_vnd >= 0),
  ledger_entry_id uuid REFERENCES ledger_entries(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sharing_post_id,recipient_id)
);
CREATE TABLE sharing_post_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id),
  actor_id uuid REFERENCES users(id), event_type text NOT NULL, affects_reputation boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_feature_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
  feature text NOT NULL, reason text NOT NULL, starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE user_policy_strikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
  policy_code text NOT NULL, source_type text NOT NULL, source_id uuid,
  severity text NOT NULL DEFAULT 'warning', created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz
);
CREATE TABLE sharing_purchase_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id),
  buyer_id uuid NOT NULL REFERENCES users(id), transaction_id uuid UNIQUE NOT NULL REFERENCES transactions(id),
  public_offer jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sharing_post_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id) ON DELETE CASCADE,
  claim_text text NOT NULL, claim_type text NOT NULL, status verification_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz, reviewer_id uuid REFERENCES users(id), review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sharing_claim_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), claim_id uuid NOT NULL REFERENCES sharing_post_claims(id) ON DELETE CASCADE,
  private_file_url text NOT NULL, submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sharing_post_members (
  sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id), transaction_id uuid REFERENCES transactions(id),
  status text NOT NULL DEFAULT 'payment_held', access_granted_at timestamptz,
  auto_release_at timestamptz, buyer_confirmed_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(), cancelled_at timestamptz,
  cancellation_timing text CHECK(cancellation_timing IS NULL OR cancellation_timing IN ('before_deadline','after_deadline','no_show')),
  refunded_vnd integer NOT NULL DEFAULT 0, host_compensation_vnd integer NOT NULL DEFAULT 0,
  completed_at timestamptz, PRIMARY KEY(sharing_post_id,user_id)
);
CREATE TABLE sharing_access_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id),
  buyer_id uuid NOT NULL REFERENCES users(id), transaction_id uuid NOT NULL REFERENCES transactions(id),
  reason text NOT NULL CHECK(reason IN ('not_accessible','not_as_described','policy_violation')),
  description text NOT NULL, status text NOT NULL DEFAULT 'open', created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz,
  UNIQUE(sharing_post_id,buyer_id)
);
CREATE TABLE sharing_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id),
  reviewer_id uuid NOT NULL REFERENCES users(id), host_id uuid NOT NULL REFERENCES users(id),
  content_rating smallint NOT NULL CHECK(content_rating BETWEEN 1 AND 5),
  host_rating smallint NOT NULL CHECK(host_rating BETWEEN 1 AND 5),
  content_comment text, host_comment text,
  accuracy_rating smallint CHECK(accuracy_rating BETWEEN 1 AND 5),
  usefulness_rating smallint CHECK(usefulness_rating BETWEEN 1 AND 5),
  freshness_rating smallint CHECK(freshness_rating BETWEEN 1 AND 5),
  communication_rating smallint CHECK(communication_rating BETWEEN 1 AND 5),
  punctuality_rating smallint CHECK(punctuality_rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sharing_post_id,reviewer_id)
);
CREATE TABLE sharing_post_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES users(id), title text NOT NULL, file_url text NOT NULL,
  original_filename text, mime_type text, size_bytes bigint,
  scan_status text NOT NULL DEFAULT 'quarantined' CHECK(scan_status IN ('quarantined','scanning','safe','rejected')),
  scan_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE content_rights_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid UNIQUE NOT NULL REFERENCES sharing_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id), terms_version text NOT NULL,
  owns_or_can_distribute boolean NOT NULL, personal_use_only_acknowledged boolean NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE copyright_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sharing_post_id uuid NOT NULL REFERENCES sharing_posts(id),
  complainant_id uuid REFERENCES users(id), complainant_email text,
  description text NOT NULL, evidence_url text, status text NOT NULL DEFAULT 'open',
  content_hidden_at timestamptz, resolved_by uuid REFERENCES users(id), resolution text,
  created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid NOT NULL REFERENCES transactions(id),
  opened_by uuid NOT NULL REFERENCES users(id), reason text NOT NULL, status text NOT NULL DEFAULT 'open',
  resolution text, resolved_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE TABLE dispute_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dispute_id uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES users(id),
  visible_to_parties boolean NOT NULL DEFAULT true, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dispute_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dispute_id uuid UNIQUE NOT NULL REFERENCES disputes(id),
  appellant_id uuid NOT NULL REFERENCES users(id), new_evidence_url text NOT NULL,
  explanation text NOT NULL, status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid REFERENCES users(id), decision text, created_at timestamptz NOT NULL DEFAULT now(),
  review_due_at timestamptz NOT NULL, resolved_at timestamptz
);
CREATE TABLE dispute_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dispute_id uuid NOT NULL REFERENCES disputes(id),
  stage text NOT NULL CHECK(stage IN ('initial','appeal')), reviewer_id uuid NOT NULL REFERENCES users(id),
  decision jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX requests_feed_idx ON requests(status, university_id, starts_at);
CREATE INDEX match_events_request_idx ON match_events(request_id, created_at);
CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);
CREATE INDEX notifications_user_idx ON notifications(user_id, read_at, created_at DESC);
CREATE INDEX attendance_appointment_idx ON attendance_events(appointment_id, created_at);
CREATE UNIQUE INDEX conversation_requests_pending_idx ON conversation_requests(sender_id,recipient_id) WHERE status='pending';
CREATE INDEX user_blocks_blocked_idx ON user_blocks(blocked_id);
CREATE INDEX posts_server_idx ON posts(server_id, moderation_status, created_at DESC);
CREATE INDEX comments_post_idx ON comments(post_id, parent_id, created_at);
CREATE INDEX post_keywords_keyword_idx ON post_keywords(keyword);
CREATE INDEX post_metrics_trending_idx ON post_metrics(trending_score DESC, updated_at DESC);
CREATE INDEX sharing_posts_discovery_idx ON sharing_posts(status, university_id, starts_at);
CREATE INDEX sharing_post_claims_status_idx ON sharing_post_claims(status, created_at) INCLUDE (sharing_post_id);
CREATE INDEX sharing_reviews_post_idx ON sharing_reviews(sharing_post_id, created_at DESC);
CREATE INDEX sharing_reviews_host_idx ON sharing_reviews(host_id, created_at DESC);
CREATE INDEX sharing_post_events_actor_idx ON sharing_post_events(actor_id, event_type, created_at DESC) WHERE affects_reputation=true;
CREATE INDEX user_feature_restrictions_active_idx ON user_feature_restrictions(user_id, feature, ends_at);
CREATE INDEX user_policy_strikes_window_idx ON user_policy_strikes(user_id, policy_code, created_at DESC);
CREATE INDEX moderation_runs_queue_idx ON moderation_runs(outcome, created_at) WHERE outcome IN ('hold','priority_hold');
CREATE INDEX users_display_name_search_idx ON users USING gin(display_name gin_trgm_ops);
CREATE INDEX sessions_user_active_idx ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX reputation_events_user_idx ON reputation_events(user_id, occurred_at DESC);
CREATE INDEX universities_name_search_idx ON universities USING gin(name gin_trgm_ops);
CREATE INDEX courses_name_search_idx ON courses USING gin(name gin_trgm_ops);
CREATE INDEX posts_title_search_idx ON posts USING gin(title gin_trgm_ops);
CREATE INDEX requests_title_search_idx ON requests USING gin(title gin_trgm_ops);
CREATE INDEX sharing_posts_title_search_idx ON sharing_posts USING gin(title gin_trgm_ops);
