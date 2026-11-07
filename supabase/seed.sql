-- Sample catalogue for the MVP. Prices and accreditation details are placeholders
-- until Training Africa Academy supplies approved content.

insert into public.courses
  (slug, code, title, subject, kind, format, format_note, location, price_cents, price_basis, duration, summary,
   outcomes, entry_requirements, assessment, practical, certificate, audience, learner_types, intakes, has_lms, featured)
values
 ('professional-cleaning-practices', 'TAA-CLN-101', 'Professional Cleaning Practices', 'Cleaning & hygiene', 'short', 'Blended',
  'Online theory + 1 supervised practical day', 'Johannesburg', 185000, 'fixed', '3 days',
  'Safe chemical use, colour-coding, floor and surface care, and a hands-on practical day in the cleaning lab.',
  array['Dilute and store cleaning chemicals safely','Apply colour-coding to prevent cross-contamination','Clean hard floors, washrooms and kitchens to a set standard','Care for cleaning equipment and report faults'],
  'No formal entry requirements. Learners must read basic English instructions and safety labels.',
  'Online knowledge quizzes, plus an observed practical task on the practical day.',
  'The practical day is compulsory and takes place at the Johannesburg centre. Online videos prepare you for it; they do not replace it.',
  'Certificate of attendance and competence (non-accredited)', 'New and working cleaners, housekeeping staff, facilities teams',
  '{individual,employer}', '{"18 Jan 2027","15 Feb 2027"}', true, true),

 ('customer-service-excellence', 'TAA-SS-110', 'Customer Service Excellence', 'Soft skills', 'short', 'Online',
  'Self-paced online, start any time', 'Online', 120000, 'fixed', '6 hours',
  'Listen well, handle complaints calmly and represent your organisation professionally in person, on the phone and on WhatsApp.',
  array['Use active listening to understand what a customer needs','Respond professionally by phone, email and WhatsApp','Handle complaints with a clear five-step process','Turn a difficult interaction into a repeat customer'],
  'No formal entry requirements.', 'Online quizzes. A pass mark of 70% unlocks your certificate.',
  'Fully online. There is no practical component.', 'Certificate of completion (non-accredited)',
  'Front-line staff, receptionists, call-centre agents, supervisors', '{individual,employer}', '{"Start any time"}', true, true),

 ('hygiene-and-infection-control', 'TAA-CLN-120', 'Hygiene and Infection Control', 'Cleaning & hygiene', 'short', 'Online',
  'Self-paced online', 'Online', 95000, 'fixed', '4 hours',
  'How infections spread in workplaces and the cleaning, hand-hygiene and PPE routines that stop them.',
  array['Explain how infections spread on surfaces','Choose the right disinfectant for the task','Use PPE correctly','Follow an outbreak cleaning routine'],
  'None.', 'Online quiz per module.', 'Fully online.', 'Certificate of completion (non-accredited)',
  'Cleaners, food handlers, care-facility and school staff', '{individual,employer}', '{"Start any time"}', true, false),

 ('health-and-safety-representative', 'TAA-HS-201', 'Health and Safety Representative', 'Health & safety', 'accredited', 'Classroom',
  'Classroom, Johannesburg or on-site', 'Johannesburg', 245000, 'fixed', '2 days',
  'The legal role of a health and safety representative, hazard identification, inspections and incident reporting.',
  array['Describe the duties of an H&S representative under the OHS Act','Identify hazards and assess risk','Conduct a workplace inspection','Report and investigate incidents'],
  'Grade 10 or equivalent recommended. Appointed or nominated H&S representatives.',
  'Formative assessments in class and a summative portfolio of evidence.',
  'Includes a supervised workplace inspection exercise.', 'Statement of results (per approval letter)',
  'Appointed H&S representatives, supervisors, SHE officers', '{individual,employer}', '{"26 Jan 2027","23 Feb 2027"}', false, true),

 ('first-aid-level-1', 'TAA-HS-101', 'First Aid Level 1', 'Health & safety', 'accredited', 'Classroom',
  'Classroom or on-site at your workplace', 'On-site', 145000, 'fixed', '1 day',
  'Emergency scene management, CPR and the first aid every workplace needs.',
  array['Manage an emergency scene safely','Perform CPR on an adult','Treat bleeding, burns and fractures','Complete a first aid incident record'],
  'None.', 'Practical assessment and written test on the day.', 'Hands-on CPR and bandaging practice is compulsory.',
  'First aid certificate (per approval letter)', 'Appointed first aiders, any staff member', '{individual,employer}',
  '{"14 Jan 2027","28 Jan 2027","11 Feb 2027"}', false, false),

 ('supervisory-skills', 'TAA-SS-301', 'Supervisory Skills for Team Leaders', 'Soft skills', 'short', 'Blended',
  '4 weekly online modules + 1 workshop day', 'Johannesburg', 450000, 'fixed', '4 weeks',
  'For new supervisors: planning shifts, giving feedback, managing performance and leading a team through change.',
  array['Plan and allocate work fairly','Give feedback that improves performance','Handle conflict in a team','Run a short, useful team meeting'],
  'Currently supervising, or about to supervise, a team.', 'Workplace assignment and workshop role-plays.',
  'Workshop day in Johannesburg.', 'Certificate of completion (non-accredited)', 'New supervisors and team leaders',
  '{individual,employer}', '{"1 Feb 2027","1 Mar 2027"}', false, true),

 ('cleaning-operations-learnership', 'TAA-Q-CLN2', 'National Certificate: Cleaning Operations (Learnership)', 'Cleaning & hygiene', 'qualification', 'Workplace',
  'Classroom + workplace experience', 'Johannesburg', null, 'learnership', '12 months',
  'A full qualification combining classroom learning with supervised workplace experience. Funded places may be available.',
  array['Complete the knowledge, practical and workplace components','Build a workplace portfolio of evidence','Prepare for the external integrated summative assessment (EISA)'],
  'Grade 9 or equivalent; aged 18 or older; available for 12 months.',
  'Knowledge and practical modules, workplace experience logbook and EISA.',
  'Workplace experience and EISA are mandatory and cannot be completed online.',
  'Full qualification certificate, issued on successful EISA (per approval letter)',
  'Unemployed youth, employed learners nominated by employers', '{learnership,employer}', '{"March 2027 intake"}', false, false),

 ('business-writing-at-work', 'TAA-SS-105', 'Business Writing at Work', 'Soft skills', 'short', 'Online',
  'Self-paced online', 'Online', 110000, 'fixed', '5 hours',
  'Clear emails, reports and WhatsApp messages that get read and acted on.',
  array['Plan a message around what the reader needs','Write short, clear emails','Structure a one-page report','Proofread your own work'],
  'None.', 'Two writing tasks reviewed by a facilitator.', 'Fully online.', 'Certificate of completion (non-accredited)',
  'Admin staff, supervisors, anyone who writes at work', '{individual,employer}', '{"Start any time"}', false, false);

-- Modules and lessons for the three pilot LMS courses
do $$
declare
  c uuid; m uuid; l uuid;
  q_cln jsonb := '[
    {"q":"Why are cleaning cloths and buckets colour-coded?","o":["To match the uniform","To prevent cross-contamination between areas","To make them easier to buy","Because it is cheaper"],"a":1},
    {"q":"What should you check before diluting a chemical?","o":["The colour of the liquid","The product label and safety data sheet","How much is left in the bottle","Nothing, use it neat"],"a":1},
    {"q":"Which equipment colour is usually kept for toilets and urinals?","o":["Blue","Green","Red","Yellow"],"a":2}]';
  q_cs jsonb := '[
    {"q":"A customer is upset about a late delivery. What should you do first?","o":["Explain the company policy","Listen without interrupting and acknowledge the problem","Offer a discount immediately","Transfer them to a manager"],"a":1},
    {"q":"Which reply shows active listening?","o":["That is not my department.","So the order arrived without the invoice, is that right?","Please calm down.","I will see what I can do."],"a":1},
    {"q":"A professional WhatsApp reply to a customer should...","o":["Use voice notes only","Use the customer''s name and confirm the next step with a time","Avoid replying after 4 pm","Use as many emojis as possible"],"a":1}]';
  q_hy jsonb := '[
    {"q":"How long must a disinfectant stay wet on a surface to work?","o":["It works instantly","For the contact time stated on the label","Exactly 10 seconds","Until it smells clean"],"a":1},
    {"q":"When should gloves be changed?","o":["Once a day","Between tasks and whenever torn or contaminated","Only when they feel uncomfortable","Never, wash them instead"],"a":1},
    {"q":"Which surfaces need the most frequent disinfection?","o":["Ceilings","High-touch surfaces like door handles and taps","Windows","Store-room shelves"],"a":1}]';
begin
  -- Professional Cleaning Practices
  select id into c from public.courses where slug = 'professional-cleaning-practices';
  insert into public.modules (course_id, position, title) values (c, 1, 'Cleaning fundamentals') returning id into m;
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 1, 'Welcome and course map', 'video', 4) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'How the course works, what the practical day involves and how to get support.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 2, 'Chemicals and safe dilution', 'video', 9) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'Reading labels and safety data sheets, measuring dilutions and storing chemicals safely.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 3, 'Colour-coding and cross-contamination', 'video', 7) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'Why each area has its own colour of cloths, mops and buckets.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 4, 'Quiz: fundamentals', 'quiz', 5) returning id into l;
  insert into public.lesson_content (lesson_id, quiz) values (l, q_cln);
  insert into public.modules (course_id, position, title) values (c, 2, 'Surfaces and equipment') returning id into m;
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 1, 'Hard floor care', 'video', 11) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'Sweeping, mopping and machine scrubbing techniques for common floor types.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 2, 'Daily cleaning checklist (PDF)', 'download', 2) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'A printable checklist for daily cleaning rounds.');

  -- Customer Service Excellence
  select id into c from public.courses where slug = 'customer-service-excellence';
  insert into public.modules (course_id, position, title) values (c, 1, 'The service mindset') returning id into m;
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 1, 'Welcome', 'video', 3) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'What this course covers and how to get the most from it.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 2, 'What customers remember', 'video', 8) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'The moments in an interaction that shape how customers feel about your organisation.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 3, 'Quiz: service basics', 'quiz', 5) returning id into l;
  insert into public.lesson_content (lesson_id, quiz) values (l, q_cs);
  insert into public.modules (course_id, position, title) values (c, 2, 'Communicating clearly') returning id into m;
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 1, 'Active listening', 'video', 10) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'Listening to understand, checking understanding and summarising.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 2, 'Phone and WhatsApp etiquette', 'video', 7) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'Professional greetings, response times and confirming next steps in writing.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 3, 'Call script template (PDF)', 'download', 2) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'A call script you can adapt for your workplace.');

  -- Hygiene and Infection Control
  select id into c from public.courses where slug = 'hygiene-and-infection-control';
  insert into public.modules (course_id, position, title) values (c, 1, 'How infection spreads') returning id into m;
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 1, 'The chain of infection', 'video', 8) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'How germs move from person to surface to person, and where to break the chain.');
  insert into public.modules (course_id, position, title) values (c, 2, 'Prevention routines') returning id into m;
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 1, 'Hand hygiene and PPE', 'video', 9) returning id into l;
  insert into public.lesson_content (lesson_id, body) values (l, 'When and how to wash hands, and putting on and removing PPE safely.');
  insert into public.lessons (module_id, position, title, kind, minutes) values (m, 2, 'Final quiz', 'quiz', 6) returning id into l;
  insert into public.lesson_content (lesson_id, quiz) values (l, q_hy);
end $$;
