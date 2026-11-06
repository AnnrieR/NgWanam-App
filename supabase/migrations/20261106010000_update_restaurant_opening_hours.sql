-- Client-requested daily hours. No changes to orders/payments or computations.
update public.restaurant_settings
set operating_hours = 'Daily, 7:30 AM - 7:00 PM'
where id = true
  and operating_hours is distinct from 'Daily, 7:30 AM - 7:00 PM';

-- Update only the original canned FAQ; preserve administrator-customized text.
update public.chatbot_rules
set response = 'Ng Wanam Food House is open daily from 7:30 AM to 7:00 PM.'
where intent = 'hours'
  and response = 'Ng Wanam Food House is open daily from 6:30 AM to 7:30 PM.';
