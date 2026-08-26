-- ============ ENUMS ============
create type public.app_role as enum ('admin','owner_manager','sales_rep','production_manager','office_admin','viewer');
create type public.lead_source as enum ('door_to_door','website','phone','referral','insurance','facebook_google','other');
create type public.lead_status as enum ('open','won','lost','nurture');
create type public.activity_type as enum ('call','email','sms','meeting','note','stage_change','document','appointment','task','system');
create type public.task_status as enum ('open','completed','cancelled');
create type public.appointment_kind as enum ('inspection','adjuster_meeting','production','walkthrough','follow_up','other');
create type public.document_category as enum ('photo','adjuster_report','insurance_scope','xactimate_estimate','supplement','contract','direction_to_pay','permit','invoice','certificate_of_completion','warranty','other');
create type public.payment_kind as enum ('deductible','acv','depreciation','supplement','other');

-- ============ HELPERS ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  job_title text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.has_any_role(_user_id uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = any(_roles));
$$;

create or replace function public.can_manage()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(auth.uid(), array['admin','owner_manager']::public.app_role[]);
$$;

create or replace function public.can_edit()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(auth.uid(), array['admin','owner_manager','sales_rep','production_manager','office_admin']::public.app_role[]);
$$;

create or replace function public.can_view_finance()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(auth.uid(), array['admin','owner_manager','office_admin']::public.app_role[]);
$$;

create or replace function public.can_view_all_leads()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(auth.uid(), array['admin','owner_manager','office_admin','production_manager','viewer']::public.app_role[]);
$$;

create policy "profiles readable by team" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid() or public.can_manage()) with check (id = auth.uid() or public.can_manage());
create policy "profiles insert self" on public.profiles for insert to authenticated with check (id = auth.uid() or public.can_manage());

create policy "roles readable by team" on public.user_roles for select to authenticated using (true);
create policy "roles managed by managers" on public.user_roles for all to authenticated using (public.can_manage()) with check (public.can_manage());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare existing int;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;
  select count(*) into existing from public.user_roles;
  if existing = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  else
    insert into public.user_roles (user_id, role) values (new.id, 'sales_rep') on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ WORKFLOW CATALOG ============
create table public.pipeline_stages (
  id int primary key,
  name text not null,
  sort_order int not null
);
grant select on public.pipeline_stages to authenticated;
grant all on public.pipeline_stages to service_role;
alter table public.pipeline_stages enable row level security;
create policy "stages readable" on public.pipeline_stages for select to authenticated using (true);

create table public.pipeline_tasks (
  code text primary key,
  stage_id int not null references public.pipeline_stages(id),
  name text not null,
  description text not null,
  sort_order int not null,
  is_terminal boolean not null default false,
  required_fields text[] not null default '{}'
);
grant select on public.pipeline_tasks to authenticated;
grant all on public.pipeline_tasks to service_role;
alter table public.pipeline_tasks enable row level security;
create policy "tasks catalog readable" on public.pipeline_tasks for select to authenticated using (true);

insert into public.pipeline_stages (id, name, sort_order) values
 (1,'Lead',1),(2,'Inspection',2),(3,'Claim Filing',3),(4,'Estimate',4),
 (5,'Contract',5),(6,'Production',6),(7,'Insurance Closeout',7),(8,'Post-Job',8);

insert into public.pipeline_tasks (code, stage_id, name, description, sort_order, is_terminal, required_fields) values
 ('1.1',1,'Lead — New','Lead created, awaiting rep contact',1,false,'{}'),
 ('1.2',1,'Lead — Attempting Contact','Rep actively trying to reach homeowner',2,false,'{}'),
 ('1.3',1,'Inspection Scheduled','Homeowner agreed; inspection on calendar',3,false,'{inspection_date}'),
 ('1.4',1,'Nurture — Not Ready','Homeowner declined for now; bi-weekly follow-up',4,false,'{}'),
 ('2.1',2,'Inspection Complete','Photos and damage documented',5,false,'{inspection_date}'),
 ('2.2',2,'Closed — No Claim','Damage does not qualify; 6-month follow-up set',6,true,'{}'),
 ('2.3',2,'Opportunity — Claim Qualified','Damage qualifies; converted to opportunity',7,false,'{}'),
 ('3.1',3,'Claim Filed — Pending Adjuster','Claim submitted; awaiting adjuster assignment',8,false,'{carrier,claim_number}'),
 ('3.2',3,'Adjuster Meeting Scheduled','Appointment confirmed with carrier',9,false,'{adjuster_meeting_at}'),
 ('3.3',3,'Adjuster Meeting Complete','Rep attended meeting with homeowner',10,false,'{}'),
 ('3.4',3,'Adjuster Report Received','Carrier issued scope and estimate',11,false,'{rcv_amount}'),
 ('3.5',3,'Supplement / Appeal Pending','Claim denied or underpaid; appeal submitted',12,false,'{}'),
 ('3.6',3,'Reinspection / 2nd Adjuster','Carrier granted second inspection',13,false,'{}'),
 ('4.1',4,'Estimate in Progress','Building Xactimate estimate from measurements',14,false,'{}'),
 ('4.2',4,'Supplement Pending — Scope Gap','Gap found between estimate and adjuster scope; supplement submitted',15,false,'{}'),
 ('5.1',5,'Contract Signed — Sold','Homeowner signed contract and Direction to Pay',16,false,'{contract_signed_at,contract_amount}'),
 ('5.2',5,'Rescission Period','Mandatory 3-business-day cancellation window',17,false,'{}'),
 ('5.3',5,'Job Created','Rescission cleared; job record created; production manager assigned',18,false,'{production_manager_id}'),
 ('5.4',5,'Permit Pending','Permit application submitted to jurisdiction',19,false,'{}'),
 ('5.5',5,'Materials Ordered','Material order placed; delivery confirmed',20,false,'{}'),
 ('5.6',5,'Production Scheduled','Install date on crew calendar; homeowner notified',21,false,'{install_date}'),
 ('6.1',6,'In Production','Crew on site; daily photo documentation',22,false,'{}'),
 ('6.2',6,'Weather Delay / Reschedule','Weather halted install; rescheduled',23,false,'{}'),
 ('6.3',6,'Change Order / Scope Increase','Additional damage found; supplement and homeowner approval required',24,false,'{}'),
 ('6.4',6,'QC Complete','Post-install inspection passed; zero punch-list items',25,false,'{}'),
 ('6.5',6,'Job Complete — Pending Docs','Homeowner walkthrough done; Certificate of Completion signed',26,false,'{}'),
 ('7.1',7,'Awaiting Depreciation Release','COC and invoice submitted to carrier; weekly follow-up',27,false,'{}'),
 ('7.2',7,'Invoiced / Paid in Full','Deductible and depreciation collected; job costing reconciled',28,false,'{}'),
 ('7.3',7,'Closed — Won','Job archived; all documents filed',29,true,'{}'),
 ('8.1',8,'Warranty Registered','Manufacturer warranty registered; workmanship warranty delivered',30,false,'{}'),
 ('8.2',8,'Review / Referral Requested','Google/Facebook review request sent; referral ask made',31,false,'{}'),
 ('8.3',8,'Customer Database — Long-Term','Annual check-in set; storm re-inspection alert enabled',32,true,'{}');

-- ============ PROPERTIES / CUSTOMERS ============
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  address_line1 text not null,
  address_line2 text,
  city text not null default '',
  state text not null default 'OK',
  postal_code text not null default '',
  property_type text,
  roof_age int,
  roof_type text,
  jurisdiction text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.properties to authenticated;
grant all on public.properties to service_role;
alter table public.properties enable row level security;
create policy "properties readable" on public.properties for select to authenticated using (true);
create policy "properties writable" on public.properties for all to authenticated using (public.can_edit()) with check (public.can_edit());
create trigger properties_updated_at before update on public.properties for each row execute function public.update_updated_at_column();

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  secondary_phone text,
  property_id uuid references public.properties(id) on delete set null,
  mailing_address_line1 text,
  mailing_city text,
  mailing_state text,
  mailing_postal_code text,
  preferred_contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "customers readable" on public.customers for select to authenticated using (true);
create policy "customers writable" on public.customers for all to authenticated using (public.can_edit()) with check (public.can_edit());
create trigger customers_updated_at before update on public.customers for each row execute function public.update_updated_at_column();

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  name text not null,
  relationship text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contacts to authenticated;
grant all on public.contacts to service_role;
alter table public.contacts enable row level security;
create policy "contacts readable" on public.contacts for select to authenticated using (true);
create policy "contacts writable" on public.contacts for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- ============ LEADS ============
create sequence public.lead_number_seq start 1001;
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_number text not null unique default 'RAR-' || nextval('public.lead_number_seq')::text,
  customer_id uuid references public.customers(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  source public.lead_source not null default 'other',
  source_detail text,
  status public.lead_status not null default 'open',
  stage_id int not null default 1 references public.pipeline_stages(id),
  task_code text not null default '1.1' references public.pipeline_tasks(code),
  assigned_rep_id uuid references auth.users on delete set null,
  production_manager_id uuid references auth.users on delete set null,
  estimated_value numeric(12,2) not null default 0,
  contract_amount numeric(12,2),
  storm_date date,
  inspection_date date,
  contract_signed_at date,
  rescission_ends_at date,
  install_date date,
  closed_at timestamptz,
  next_follow_up_at date,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_stage_idx on public.leads(stage_id, task_code);
create index leads_rep_idx on public.leads(assigned_rep_id);
create index leads_property_idx on public.leads(property_id);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "leads readable by scope" on public.leads for select to authenticated
  using (public.can_view_all_leads() or assigned_rep_id = auth.uid() or created_by = auth.uid());
create policy "leads insert" on public.leads for insert to authenticated with check (public.can_edit());
create policy "leads update" on public.leads for update to authenticated
  using (public.can_edit() and (public.can_view_all_leads() or assigned_rep_id = auth.uid() or created_by = auth.uid()))
  with check (public.can_edit());
create policy "leads delete" on public.leads for delete to authenticated using (public.can_manage());
create trigger leads_updated_at before update on public.leads for each row execute function public.update_updated_at_column();

create table public.lead_stage_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_task_code text,
  to_task_code text not null,
  changed_by uuid references auth.users on delete set null,
  is_override boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);
create index lead_stage_history_lead_idx on public.lead_stage_history(lead_id, created_at desc);
grant select, insert on public.lead_stage_history to authenticated;
grant all on public.lead_stage_history to service_role;
alter table public.lead_stage_history enable row level security;
create policy "stage history readable" on public.lead_stage_history for select to authenticated using (true);
create policy "stage history insert" on public.lead_stage_history for insert to authenticated with check (public.can_edit());

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  type public.activity_type not null default 'note',
  subject text not null,
  body text,
  actor_id uuid references auth.users on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index activities_lead_idx on public.activities(lead_id, occurred_at desc);
grant select, insert, update, delete on public.activities to authenticated;
grant all on public.activities to service_role;
alter table public.activities enable row level security;
create policy "activities readable" on public.activities for select to authenticated using (true);
create policy "activities writable" on public.activities for all to authenticated using (public.can_edit()) with check (public.can_edit());

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  body text not null,
  author_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.notes enable row level security;
create policy "notes readable" on public.notes for select to authenticated using (true);
create policy "notes writable" on public.notes for all to authenticated using (public.can_edit()) with check (public.can_edit());

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  title text not null,
  details text,
  due_at timestamptz,
  status public.task_status not null default 'open',
  priority text not null default 'normal',
  kind text not null default 'follow_up',
  assigned_to uuid references auth.users on delete set null,
  auto_generated boolean not null default false,
  completed_at timestamptz,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_due_idx on public.tasks(status, due_at);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;
create policy "tasks readable" on public.tasks for select to authenticated using (true);
create policy "tasks writable" on public.tasks for all to authenticated using (public.can_edit()) with check (public.can_edit());
create trigger tasks_updated_at before update on public.tasks for each row execute function public.update_updated_at_column();

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  kind public.appointment_kind not null default 'other',
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  attendees text,
  notes text,
  assigned_to uuid references auth.users on delete set null,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appointments_start_idx on public.appointments(starts_at);
grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
alter table public.appointments enable row level security;
create policy "appointments readable" on public.appointments for select to authenticated using (true);
create policy "appointments writable" on public.appointments for all to authenticated using (public.can_edit()) with check (public.can_edit());
create trigger appointments_updated_at before update on public.appointments for each row execute function public.update_updated_at_column();

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade,
  category public.document_category not null default 'other',
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,
  caption text,
  uploaded_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index documents_lead_idx on public.documents(lead_id, created_at desc);
grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;
alter table public.documents enable row level security;
create policy "documents readable" on public.documents for select to authenticated using (true);
create policy "documents writable" on public.documents for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- ============ INSURANCE ============
create table public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  carrier text,
  claim_number text,
  policy_number text,
  policy_details text,
  adjuster_name text,
  adjuster_phone text,
  adjuster_email text,
  date_of_loss date,
  date_filed date,
  adjuster_meeting_at timestamptz,
  adjuster_report_received_at date,
  rcv_amount numeric(12,2),
  acv_amount numeric(12,2),
  deductible numeric(12,2),
  depreciation_amount numeric(12,2),
  depreciation_released_at date,
  supplement_amount numeric(12,2),
  supplement_status text,
  appeal_status text,
  reinspection_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index insurance_claims_lead_idx on public.insurance_claims(lead_id);
grant select, insert, update, delete on public.insurance_claims to authenticated;
grant all on public.insurance_claims to service_role;
alter table public.insurance_claims enable row level security;
create policy "claims readable" on public.insurance_claims for select to authenticated using (true);
create policy "claims writable" on public.insurance_claims for all to authenticated using (public.can_edit()) with check (public.can_edit());
create trigger insurance_claims_updated_at before update on public.insurance_claims for each row execute function public.update_updated_at_column();

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  estimate_number text,
  source text not null default 'xactimate',
  total_amount numeric(12,2) not null default 0,
  status text not null default 'draft',
  scope_gap_amount numeric(12,2),
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.estimates to authenticated;
grant all on public.estimates to service_role;
alter table public.estimates enable row level security;
create policy "estimates readable" on public.estimates for select to authenticated using (true);
create policy "estimates writable" on public.estimates for all to authenticated using (public.can_edit()) with check (public.can_edit());
create trigger estimates_updated_at before update on public.estimates for each row execute function public.update_updated_at_column();

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  contract_amount numeric(12,2) not null default 0,
  signed_at date,
  rescission_ends_at date,
  direction_to_pay_signed boolean not null default false,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.contracts to authenticated;
grant all on public.contracts to service_role;
alter table public.contracts enable row level security;
create policy "contracts readable" on public.contracts for select to authenticated using (true);
create policy "contracts writable" on public.contracts for all to authenticated using (public.can_edit()) with check (public.can_edit());
create trigger contracts_updated_at before update on public.contracts for each row execute function public.update_updated_at_column();

-- ============ FINANCE ============
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  invoice_number text,
  amount numeric(12,2) not null default 0,
  issued_at date,
  due_at date,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "invoices finance read" on public.invoices for select to authenticated using (public.can_view_finance());
create policy "invoices finance write" on public.invoices for all to authenticated using (public.can_view_finance()) with check (public.can_view_finance());
create trigger invoices_updated_at before update on public.invoices for each row execute function public.update_updated_at_column();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  kind public.payment_kind not null default 'other',
  method text,
  received_at date,
  reference text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "payments finance read" on public.payments for select to authenticated using (public.can_view_finance());
create policy "payments finance write" on public.payments for all to authenticated using (public.can_view_finance()) with check (public.can_view_finance());

create table public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  applies_to_role public.app_role not null default 'sales_rep',
  basis text not null default 'contract_amount',
  percent numeric(5,2) not null default 10,
  flat_amount numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.commission_rules to authenticated;
grant all on public.commission_rules to service_role;
alter table public.commission_rules enable row level security;
create policy "commission rules read" on public.commission_rules for select to authenticated using (public.can_view_finance());
create policy "commission rules write" on public.commission_rules for all to authenticated using (public.can_manage()) with check (public.can_manage());

create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  rep_id uuid references auth.users on delete set null,
  rule_id uuid references public.commission_rules(id) on delete set null,
  amount numeric(12,2) not null default 0,
  status text not null default 'pending',
  paid_at date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.commissions to authenticated;
grant all on public.commissions to service_role;
alter table public.commissions enable row level security;
create policy "commissions read" on public.commissions for select to authenticated using (public.can_view_finance() or rep_id = auth.uid());
create policy "commissions write" on public.commissions for all to authenticated using (public.can_view_finance()) with check (public.can_view_finance());

-- ============ PRODUCTION ============
create table public.production_jobs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  production_manager_id uuid references auth.users on delete set null,
  crew_name text,
  install_date date,
  permit_status text not null default 'not_started',
  permit_submitted_at date,
  permit_approved_at date,
  material_order_status text not null default 'not_ordered',
  material_ordered_at date,
  material_delivery_date date,
  weather_delay_notes text,
  rescheduled_to date,
  qc_passed_at date,
  punch_list text,
  walkthrough_at date,
  coc_signed_at date,
  warranty_registered_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index production_jobs_lead_idx on public.production_jobs(lead_id);
grant select, insert, update, delete on public.production_jobs to authenticated;
grant all on public.production_jobs to service_role;
alter table public.production_jobs enable row level security;
create policy "production readable" on public.production_jobs for select to authenticated using (true);
create policy "production writable" on public.production_jobs for all to authenticated using (public.can_edit()) with check (public.can_edit());
create trigger production_jobs_updated_at before update on public.production_jobs for each row execute function public.update_updated_at_column();

create table public.change_orders (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid references public.production_jobs(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null default 0,
  homeowner_approved boolean not null default false,
  supplement_submitted boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.change_orders to authenticated;
grant all on public.change_orders to service_role;
alter table public.change_orders enable row level security;
create policy "change orders readable" on public.change_orders for select to authenticated using (true);
create policy "change orders writable" on public.change_orders for all to authenticated using (public.can_edit()) with check (public.can_edit());

-- ============ AUDIT ============
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  summary text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log(entity, entity_id, created_at desc);
grant select, insert on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;
create policy "audit readable by managers" on public.audit_log for select to authenticated using (public.can_manage());
create policy "audit insert" on public.audit_log for insert to authenticated with check (auth.uid() is not null);

-- ============ SETTINGS ============
create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "settings readable" on public.app_settings for select to authenticated using (true);
create policy "settings writable" on public.app_settings for all to authenticated using (public.can_manage()) with check (public.can_manage());

insert into public.app_settings (key, value) values
 ('company', '{"name":"Rise Above Roofing Oklahoma","phone":"","email":"","address":"Oklahoma"}'::jsonb),
 ('automation', '{"nurture_days":14,"no_claim_followup_days":180,"depreciation_followup_days":7,"annual_checkin_days":365,"rescission_business_days":3,"stalled_job_days":14}'::jsonb);

insert into public.commission_rules (name, applies_to_role, basis, percent) values
 ('Standard Sales Rep Commission','sales_rep','contract_amount',10),
 ('Senior Rep Commission','sales_rep','contract_amount',12);

-- ============ STORAGE POLICIES ============
create policy "crm files readable by team" on storage.objects for select to authenticated using (bucket_id = 'crm-files');
create policy "crm files uploadable by team" on storage.objects for insert to authenticated with check (bucket_id = 'crm-files' and public.can_edit());
create policy "crm files updatable by team" on storage.objects for update to authenticated using (bucket_id = 'crm-files' and public.can_edit());
create policy "crm files deletable by managers" on storage.objects for delete to authenticated using (bucket_id = 'crm-files' and public.can_manage());