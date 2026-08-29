DO $$
BEGIN
  -- Child rows keyed through appointments
  DELETE FROM public.appointment_notifications
    WHERE appointment_id IN (SELECT id FROM public.appointments WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%'))
       OR lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.appointments WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');

  -- Direct children of leads
  DELETE FROM public.documents WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.payments WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.invoices WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.estimate_line_items WHERE estimate_id IN (SELECT id FROM public.estimates WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%'));
  DELETE FROM public.estimates WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.change_orders WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.production_jobs WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.supplements WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.insurance_claims WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.contracts WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.commissions WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.milestone_payouts WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.lead_stage_history WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.activities WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.tasks WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.notifications WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');
  DELETE FROM public.notes WHERE lead_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');

  -- Audit entries referencing test leads
  DELETE FROM public.audit_log WHERE entity = 'leads' AND entity_id IN (SELECT id FROM public.leads WHERE lead_number LIKE 'RAR-T%');

  -- The test leads themselves
  DELETE FROM public.leads WHERE lead_number LIKE 'RAR-T%';

  -- Contacts/documents/activities referencing orphaned test customers
  DELETE FROM public.contacts WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM public.leads WHERE customer_id IS NOT NULL);
  DELETE FROM public.documents WHERE customer_id IS NOT NULL AND customer_id NOT IN (SELECT DISTINCT customer_id FROM public.leads WHERE customer_id IS NOT NULL);
  DELETE FROM public.activities WHERE customer_id IS NOT NULL AND customer_id NOT IN (SELECT DISTINCT customer_id FROM public.leads WHERE customer_id IS NOT NULL);

  -- Orphaned test customers and properties (only those with no remaining leads)
  DELETE FROM public.customers WHERE id NOT IN (SELECT DISTINCT customer_id FROM public.leads WHERE customer_id IS NOT NULL);
  DELETE FROM public.properties WHERE id NOT IN (SELECT DISTINCT property_id FROM public.leads WHERE property_id IS NOT NULL)
    AND id NOT IN (SELECT DISTINCT property_id FROM public.customers WHERE property_id IS NOT NULL);
END $$;