-- Owner-run read-only diagnostics. Accounts and records remain independent.
select p.user_id, p.display_name, count(r.id) as reports,
  sum(r.points) as all_imported_points,
  sum(r.points) filter (where r.work_date >= date '2026-07-01') as points_since_july,
  min(r.work_date) as first_work_date, max(r.work_date) as latest_work_date,
  max(r.imported_at) as latest_import
from public.tracker_people p left join public.productivity_reports r on r.owner_id = p.user_id
where p.user_id in ('632f55e5-c819-445f-8d71-4b1ef1bd6478', 'e9e9e1f6-70b0-4eca-a80d-4a0420ef7bb2')
group by p.user_id, p.display_name;

select m.month::date as month, count(r.id) as reports, sum(r.points) as points,
  sum(r.points) * 0.50 as point_value, sum(r.rtf_revenue_cents) / 100.0 as known_rtf_revenue,
  sum(r.rtf_commission) as known_rtf_commission,
  count(r.id) filter (where r.rtf_revenue_cents is null) as reports_missing_rtf,
  min(r.work_date) as first_work_date, max(r.work_date) as latest_work_date,
  min(r.imported_at) as first_import, max(r.imported_at) as latest_import
from generate_series(timestamp '2026-07-01', date_trunc('month', current_date::timestamp), interval '1 month') m(month)
left join public.productivity_reports r on r.owner_id = '632f55e5-c819-445f-8d71-4b1ef1bd6478'
  and r.work_date >= m.month::date and r.work_date < (m.month + interval '1 month')::date
group by m.month order by m.month;

select r.id, r.owner_id, s.name as store, r.work_date, r.points,
  sum(r.points) over (order by r.work_date, r.store_id, r.id) as running_imported_points,
  r.rtf_revenue_cents / 100.0 as rtf_revenue, r.rtf_commission, r.activity,
  r.source_chat_id, r.source_message_id, r.source_sent_at, r.imported_at
from public.productivity_reports r join public.tracker_stores s on s.id = r.store_id
where r.owner_id = '632f55e5-c819-445f-8d71-4b1ef1bd6478'
order by r.work_date, r.store_id, r.id;
