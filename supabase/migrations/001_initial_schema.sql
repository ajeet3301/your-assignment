-- Supabase Schema for YourAssignment
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table if not exists public.profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid unique references auth.users(id) on delete cascade,
    display_name text,
    avatar_url text,
    plan text not null default 'free' check (plan in ('free', 'pro', 'premium')),
    credits_balance integer not null default 50,
    role text not null default 'user' check (role in ('user', 'admin')),
    locale text default 'en',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. PROJECTS
create table if not exists public.projects (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Untitled Assignment',
    type text not null default 'handwriting' check (type in ('handwriting', 'solver')),
    document jsonb not null default '{}'::jsonb,
    thumbnail_url text,
    status text not null default 'draft' check (status in ('draft', 'processing', 'completed', 'archived')),
    deleted_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. PROJECT VERSIONS
create table if not exists public.project_versions (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid not null references public.projects(id) on delete cascade,
    document jsonb not null,
    created_at timestamptz not null default now()
);

-- 4. ASSIGNMENTS
create table if not exists public.assignments (
    id uuid primary key default uuid_generate_v4(),
    project_id uuid not null references public.projects(id) on delete cascade,
    source_file_ids jsonb not null default '[]'::jsonb,
    extraction_status text not null default 'pending' check (extraction_status in ('pending', 'parsing', 'extracting', 'completed', 'failed')),
    raw_text text,
    question_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 5. QUESTIONS
create table if not exists public.questions (
    id uuid primary key default uuid_generate_v4(),
    assignment_id uuid not null references public.assignments(id) on delete cascade,
    order_index integer not null default 0,
    number_label text not null,
    text text not null,
    marks integer,
    type text not null default 'theory',
    subject text,
    answer jsonb default '{}'::jsonb,
    status text not null default 'pending' check (status in ('pending', 'generating', 'done', 'failed', 'edited')),
    ai_provider text,
    tokens_used integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 6. UPLOADS
create table if not exists public.uploads (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    storage_path text not null,
    mime text not null,
    size bigint not null,
    kind text not null check (kind in ('assignment', 'image', 'font', 'background')),
    expires_at timestamptz default (now() + interval '30 days'),
    created_at timestamptz not null default now()
);

-- 7. HANDWRITING PROFILES
create table if not exists public.handwriting_profiles (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    kind text not null default 'builtin' check (kind in ('builtin', 'uploaded_font', 'template_font')),
    font_path text,
    settings jsonb not null default '{}'::jsonb,
    is_default boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 8. CODE RUNS
create table if not exists public.code_runs (
    id uuid primary key default uuid_generate_v4(),
    question_id uuid references public.questions(id) on delete set null,
    language text not null,
    language_version text,
    source text not null,
    stdin text default '',
    stdout text default '',
    stderr text default '',
    exit_code integer default 0,
    runtime_ms integer default 0,
    mode text not null check (mode in ('executed', 'simulated')),
    created_at timestamptz not null default now()
);

-- 9. TERMINAL DESIGNS
create table if not exists public.terminal_designs (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    code_run_id uuid references public.code_runs(id) on delete cascade,
    theme text not null default 'windows-terminal',
    settings jsonb not null default '{}'::jsonb,
    edited_text text,
    image_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 10. TEMPLATES
create table if not exists public.templates (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    category text not null,
    description text,
    document jsonb not null default '{}'::jsonb,
    is_premium boolean not null default false,
    is_published boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 11. CREDIT TRANSACTIONS
create table if not exists public.credit_transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    amount integer not null,
    reason text not null,
    ref_id text,
    balance_after integer not null,
    created_at timestamptz not null default now()
);

-- 12. SUBSCRIPTIONS
create table if not exists public.subscriptions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null check (provider in ('razorpay', 'stripe')),
    provider_subscription_id text not null,
    plan text not null check (plan in ('pro', 'premium')),
    status text not null,
    current_period_end timestamptz not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 13. PAYMENTS
create table if not exists public.payments (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    provider text not null check (provider in ('razorpay', 'stripe')),
    provider_payment_id text not null,
    amount integer not null,
    currency text not null default 'INR',
    status text not null,
    created_at timestamptz not null default now()
);

-- 14. AI REQUESTS
create table if not exists public.ai_requests (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid references auth.users(id) on delete set null,
    provider text not null,
    model text not null,
    purpose text not null,
    tokens_in integer default 0,
    tokens_out integer default 0,
    latency_ms integer default 0,
    status text not null,
    error_code text,
    cache_hit boolean default false,
    created_at timestamptz not null default now()
);

-- 15. AUDIT LOGS
create table if not exists public.audit_logs (
    id uuid primary key default uuid_generate_v4(),
    actor_id uuid references auth.users(id) on delete set null,
    action text not null,
    target text,
    metadata jsonb default '{}'::jsonb,
    ip text,
    created_at timestamptz not null default now()
);

-- 16. FEATURE FLAGS
create table if not exists public.feature_flags (
    id uuid primary key default uuid_generate_v4(),
    key text unique not null,
    enabled boolean not null default false,
    rules jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- INDEXES
create index if not exists idx_profiles_user on public.profiles(user_id);
create index if not exists idx_projects_user_updated on public.projects(user_id, updated_at desc);
create index if not exists idx_project_versions_project on public.project_versions(project_id, created_at desc);
create index if not exists idx_assignments_project on public.assignments(project_id);
create index if not exists idx_questions_assignment on public.questions(assignment_id, order_index);
create index if not exists idx_uploads_user on public.uploads(user_id);
create index if not exists idx_handwriting_profiles_user on public.handwriting_profiles(user_id);
create index if not exists idx_code_runs_question on public.code_runs(question_id);
create index if not exists idx_credit_trans_user on public.credit_transactions(user_id, created_at desc);
create index if not exists idx_ai_requests_provider on public.ai_requests(provider, created_at desc);

-- ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.assignments enable row level security;
alter table public.questions enable row level security;
alter table public.uploads enable row level security;
alter table public.handwriting_profiles enable row level security;
alter table public.terminal_designs enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;

-- POLICIES
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);

create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id and deleted_at is null);
create policy "Users can insert own projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

create policy "Users can view own project versions" on public.project_versions for select
using (exists (select 1 from public.projects where projects.id = project_versions.project_id and projects.user_id = auth.uid()));

create policy "Users can view own handwriting profiles" on public.handwriting_profiles for all using (auth.uid() = user_id);
create policy "Users can view own uploads" on public.uploads for all using (auth.uid() = user_id);
create policy "Users can view own credit transactions" on public.credit_transactions for select using (auth.uid() = user_id);
create policy "Users can view own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can view own payments" on public.payments for select using (auth.uid() = user_id);
