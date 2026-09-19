-- Lets a vendor request a withdrawal (the "Send request to admin" button on
-- the vendor Payments page had no onClick at all - found during the full
-- dashboard audit). Vendors could already SELECT their own payouts but had
-- no INSERT policy, so even wiring the button up would have failed RLS.
--
-- Scoped narrowly: a vendor may only insert a row for their own vendor_id,
-- and only with status 'pending' (the column default) - they cannot mark
-- their own request paid or set a transaction reference; only admin
-- (existing payouts_admin_all policy) can do that.

create policy "payouts_vendor_insert_request"
  on public.payouts for insert
  with check (
    status = 'pending'
    and transaction_reference is null
    and payout_date is null
    and exists (
      select 1 from public.vendors v
      where v.id = payouts.vendor_id and v.owner_id = auth.uid()
    )
  );
