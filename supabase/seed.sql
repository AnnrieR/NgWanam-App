-- Local-only thesis accounts. Never reuse these passwords outside Docker.
-- Password for every seeded account: NgWanam123!
with seeded_users (id, email, full_name, role) as (
  values
    ('10000000-0000-0000-0000-000000000001'::uuid, 'admin@ngwanam.local', 'Ng Wanam Admin', 'admin'::public.profile_role),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'kitchen1@ngwanam.local', 'Kitchen Staff One', 'staff'::public.profile_role),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'kitchen2@ngwanam.local', 'Kitchen Staff Two', 'staff'::public.profile_role),
    ('10000000-0000-0000-0000-000000000004'::uuid, 'rider@ngwanam.local', 'Delivery Rider', 'delivery'::public.profile_role),
    ('10000000-0000-0000-0000-000000000005'::uuid, 'customer@ngwanam.local', 'Test Customer', 'customer'::public.profile_role)
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000'::uuid, id, 'authenticated', 'authenticated', email,
  extensions.crypt('NgWanam123!', extensions.gen_salt('bf')), now(), '', '', '', '',
  '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', full_name), now(), now()
from seeded_users
on conflict (id) do update set
  email = excluded.email,
   encrypted_password = excluded.encrypted_password,
   email_confirmed_at = excluded.email_confirmed_at,
   confirmation_token = excluded.confirmation_token,
   recovery_token = excluded.recovery_token,
   email_change_token_new = excluded.email_change_token_new,
   email_change = excluded.email_change,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

with seeded_users (id, email, full_name, role) as (
  values
    ('10000000-0000-0000-0000-000000000001'::uuid, 'admin@ngwanam.local', 'Ng Wanam Admin', 'admin'::public.profile_role),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'kitchen1@ngwanam.local', 'Kitchen Staff One', 'staff'::public.profile_role),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'kitchen2@ngwanam.local', 'Kitchen Staff Two', 'staff'::public.profile_role),
    ('10000000-0000-0000-0000-000000000004'::uuid, 'rider@ngwanam.local', 'Delivery Rider', 'delivery'::public.profile_role),
    ('10000000-0000-0000-0000-000000000005'::uuid, 'customer@ngwanam.local', 'Test Customer', 'customer'::public.profile_role)
)
insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
select id, id, jsonb_build_object('sub', id::text, 'email', email), 'email', email, now(), now()
from seeded_users
on conflict (provider, provider_id) do update set identity_data = excluded.identity_data, updated_at = now();

with seeded_users (id, email, full_name, role) as (
  values
    ('10000000-0000-0000-0000-000000000001'::uuid, 'admin@ngwanam.local', 'Ng Wanam Admin', 'admin'::public.profile_role),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'kitchen1@ngwanam.local', 'Kitchen Staff One', 'staff'::public.profile_role),
    ('10000000-0000-0000-0000-000000000003'::uuid, 'kitchen2@ngwanam.local', 'Kitchen Staff Two', 'staff'::public.profile_role),
    ('10000000-0000-0000-0000-000000000004'::uuid, 'rider@ngwanam.local', 'Delivery Rider', 'delivery'::public.profile_role),
    ('10000000-0000-0000-0000-000000000005'::uuid, 'customer@ngwanam.local', 'Test Customer', 'customer'::public.profile_role)
)
update public.profiles p
set full_name = u.full_name, email = u.email, role = u.role, is_active = true
from seeded_users u
where p.id = u.id;

-- Every seeded serving starts available for local thesis demonstrations.
update public.inventory set current_stock = 25, minimum_stock = 5 where current_stock = 0;

update public.restaurant_settings
set delivery_fee = 50
where id = true and delivery_fee is null;

insert into public.categories (name, sort_order) values
  ('Vegetable', 15), ('Rice', 16), ('Soup', 17), ('Others', 18)
on conflict (name) do nothing;

with menu_seed (category_name, item_name, description, best_seller, preorder, variants) as (values
  ('Pancit', 'Miki Guisado', null, true, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":110},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":170}]'),
  ('Pancit', 'Canton', null, false, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":130},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":190}]'),
  ('Pancit', 'Canton - Bihon', null, false, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":130},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":190}]'),
  ('Pancit', 'Bihon', null, false, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":130},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":190}]'),
  ('Pancit', 'Miki Bihon', null, false, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":130},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":190}]'),
  ('Pancit', 'Miki Guisado (Chicken Lahok)', null, false, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":140},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":200}]'),
  ('Pancit', 'Lechon Guisado (Miki)', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":170}]'),
  ('Pancit', 'Chinese Lomi', null, false, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":110},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":160}]'),
  ('Pancit', 'Pork Mami', null, false, false, '[{"name":"Regular","label":"Good for 1","min":1,"max":1,"price":110}]'),
  ('Pancit', 'Chicken Mami', null, false, false, '[{"name":"Regular","label":"Good for 1","min":1,"max":1,"price":110}]'),
  ('Pancit', 'Pinoy Style Spaghetti with Garlic Bread', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":170}]'),
  ('Pancit', 'Classic Carbonara with Garlic Bread', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":215}]'),
  ('Chicken', 'Fried Chicken', null, true, false, '[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":225},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":450}]'),
  ('Chicken', 'Chicken Asado', null, false, false, '[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":225},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":450}]'),
  ('Chicken', 'Chop Chicken', null, false, false, '[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":275},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":550}]'),
  ('Chicken', 'Boneless Chicken with Ham', null, false, false, '[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":275},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":550}]'),
  ('Chicken', 'Breaded Chicken', null, false, false, '[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":275},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":550}]'),
  ('Chicken', 'Fried Chicken with Vegetables (Hong Kong Style)', null, false, false, '[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":300},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":600}]'),
  ('Chicken', 'Sweet and Sour Chicken', null, false, false, '[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":300},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":600}]'),
  ('Chicken', 'Chicken Lumpia Shanghai', null, false, false, '[{"name":"15 pieces","label":"15 pieces","min":1,"max":1,"price":180}]'),
  ('Pork', 'Lumpia Shanghai', null, true, false, '[{"name":"20 pieces","label":"Good for 4","min":4,"max":4,"price":170}]'),
  ('Pork', 'Sweet and Sour Meatballs', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":170}]'),
  ('Pork', 'Pork Liver with Greenpeas', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":170}]'),
  ('Pork', 'Pork Liver Steak', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":180}]'),
  ('Pork', 'Halo Guisado', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":200}]'),
  ('Pork', 'Halo Prito', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":200}]'),
  ('Pork', 'Lechon Kawali', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":230}]'),
  ('Pork', 'Lechon with Vegetables', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":250}]'),
  ('Pork', 'Sweet and Sour Pork', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":230}]'),
  ('Pork', 'Pork Steak', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":230}]'),
  ('Pork', 'Pork Asado', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":250}]'),
  ('Pork', 'Pork Sisig', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":250}]'),
  ('Pork', 'Embutido', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":200}]'),
  ('Pork', 'Ball n Ball', null, false, false, '[{"name":"Regular","label":"Good for 5","min":5,"max":5,"price":350}]'),
  ('Pork', 'Crispy Pata', null, false, false, '[{"name":"Regular","label":"Good for 5","min":5,"max":5,"price":700}]'),
  ('Pork', 'Pata Tim Special', null, false, false, '[{"name":"Regular","label":"Good for 5","min":5,"max":5,"price":870}]'),
  ('Seafood', 'Chinese Style Pusit Guisado', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":230}]'),
  ('Seafood', 'Fried Calamares', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":230}]'),
  ('Seafood', 'Sweet and Sour Fish Fillet', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":250}]'),
  ('Seafood', 'Camarón Rebusado', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":230}]'),
  ('Seafood', 'Fried Shrimp with Sweet and Sour Sauce', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":230}]'),
  ('Seafood', 'Sinigang na Hipon', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":230}]'),
  ('Seafood', 'Shrimp Lumpia', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":250}]'),
  ('Vegetable', 'Pork Chopsuey', null, true, false, '[{"name":"Good for 2","label":"Good for 2","min":2,"max":2,"price":200},{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":800}]'),
  ('Vegetable', 'Beef Chopsuey', null, false, false, '[{"name":"Good for 2","label":"Good for 2","min":2,"max":2,"price":220},{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":900}]'),
  ('Vegetable', 'Chicken Chopsuey', null, false, false, '[{"name":"Good for 2","label":"Good for 2","min":2,"max":2,"price":220},{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":900}]'),
  ('Vegetable', 'Shrimp Chopsuey', null, false, false, '[{"name":"Good for 2","label":"Good for 2","min":2,"max":2,"price":220},{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":900}]'),
  ('Vegetable', 'Pork Ampalaya', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":200}]'),
  ('Vegetable', 'Shrimp with Ampalaya', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":220}]'),
  ('Vegetable', 'Beef with Ampalaya', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":220}]'),
  ('Vegetable', 'Shrimp with Cauliflower', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":220}]'),
  ('Vegetable', 'Pusit with Vegetables', null, false, false, '[{"name":"Regular","label":"Good for 2","min":2,"max":2,"price":240}]'),
  ('Rice', 'Plain Rice', null, false, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":35}]'),
  ('Rice', 'Fried Rice', null, true, false, '[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":120},{"name":"Good for 4","label":"Good for 4","min":4,"max":4,"price":250}]'),
  ('Rice', 'Shrimp Fried Rice', null, false, false, '[{"name":"Good for 2","label":"Good for 2","min":2,"max":2,"price":270}]'),
  ('Rice', 'Chicken Fried Rice', null, false, false, '[{"name":"Good for 2","label":"Good for 2","min":2,"max":2,"price":280}]'),
  ('Rice', 'Seafood Fried Rice', null, false, false, '[{"name":"Good for 2","label":"Good for 2","min":2,"max":2,"price":300}]'),
  ('Soup', 'Hototay Soup', null, true, false, '[{"name":"Regular","label":"Good for 3","min":3,"max":3,"price":220}]'),
  ('Soup', 'Nido Soup', null, false, false, '[{"name":"Regular","label":"Good for 3","min":3,"max":3,"price":220}]'),
  ('Soup', 'Chopsuey Soup', null, false, false, '[{"name":"Regular","label":"Good for 3","min":3,"max":3,"price":220}]'),
  ('Soup', 'Wonton Soup', null, false, false, '[{"name":"Regular","label":"Good for 3","min":3,"max":3,"price":220}]'),
  ('Soup', 'Crab and Corn Soup', null, false, false, '[{"name":"Regular","label":"Good for 3","min":3,"max":3,"price":220}]'),
  ('Appetizer', 'Fried Lumpia Gulay', null, false, false, '[{"name":"4 pieces","label":"4 pieces","min":1,"max":1,"price":150},{"name":"10 pieces","label":"10 pieces","min":1,"max":1,"price":360},{"name":"15 pieces","label":"15 pieces","min":1,"max":1,"price":540}]'),
  ('Appetizer', 'Chicharon Bulaklak', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":240}]'),
  ('Appetizer', 'Tokwa''t Baboy', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":180}]'),
  ('Sandwiches', 'Cheese Sandwich', null, false, false, '[{"name":"Regular","label":"Regular sandwich","min":1,"max":1,"price":70}]'),
  ('Sandwiches', 'Egg Sandwich', null, false, false, '[{"name":"Regular","label":"Regular sandwich","min":1,"max":1,"price":70}]'),
  ('Sandwiches', 'Ham Sandwich', null, false, false, '[{"name":"Regular","label":"Regular sandwich","min":1,"max":1,"price":70}]'),
  ('Sandwiches', 'Chicken Sandwich', null, false, false, '[{"name":"Regular","label":"Regular sandwich","min":1,"max":1,"price":80}]'),
  ('Sandwiches', 'Ham and Cheese Sandwich', null, false, false, '[{"name":"Regular","label":"Regular sandwich","min":1,"max":1,"price":80}]'),
  ('Sandwiches', 'Ham and Egg Sandwich', null, false, false, '[{"name":"Regular","label":"Regular sandwich","min":1,"max":1,"price":80}]'),
  ('Sandwiches', 'Egg and Cheese Sandwich', null, false, false, '[{"name":"Regular","label":"Regular sandwich","min":1,"max":1,"price":80}]'),
  ('Drinks', 'Mismo Size Softdrink', null, false, false, '[{"name":"Regular","label":"Regular bottle","min":1,"max":1,"price":30}]'),
  ('Drinks', '1.5L Softdrinks', null, false, false, '[{"name":"Regular","label":"1.5 litre bottle","min":1,"max":1,"price":110}]'),
  ('Drinks', 'Iced Tea Pitcher', null, false, false, '[{"name":"Regular","label":"Pitcher","min":1,"max":1,"price":80}]'),
  ('Drinks', 'Pineapple Juice', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":60}]'),
  ('Drinks', 'Coffee', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":30}]'),
  ('Drinks', 'Bottled Water', null, false, false, '[{"name":"Regular","label":"Regular bottle","min":1,"max":1,"price":25}]'),
  ('Dessert', 'Leche Flan', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":130}]'),
  ('Family Sizes', 'Miki Guisado - Pork Lahok', null, true, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":550},{"name":"Good for 12","label":"Good for 12","min":12,"max":12,"price":700}]'),
  ('Family Sizes', 'Miki-Bihon / Canton-Bihon / Bihon / Canton - Pork Lahok', null, false, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":600},{"name":"Good for 12","label":"Good for 12","min":12,"max":12,"price":800}]'),
  ('Family Sizes', 'Miki Guisado - Chicken Lahok', null, true, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":600},{"name":"Good for 12","label":"Good for 12","min":12,"max":12,"price":750}]'),
  ('Family Sizes', 'Miki-Bihon / Canton-Bihon / Bihon / Canton - Chicken Lahok', null, false, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":650},{"name":"Good for 12","label":"Good for 12","min":12,"max":12,"price":850}]'),
  ('Family Sizes', 'Lumpia Shanghai Bilao', null, false, true, '[{"name":"100 pieces","label":"Good for 25 (100 pieces)","min":25,"max":25,"price":950},{"name":"200 pieces","label":"Good for 50 (200 pieces)","min":50,"max":50,"price":1850}]'),
  ('Family Sizes', 'Fried Chicken Bilao', null, false, true, '[{"name":"Good for 15","label":"Good for 15","min":15,"max":15,"price":1500},{"name":"Good for 30","label":"Good for 30","min":30,"max":30,"price":3000}]'),
  ('Family Sizes', 'Fried Rice Tray', null, false, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":800},{"name":"Good for 12","label":"Good for 12","min":12,"max":12,"price":1100}]'),
  ('Family Sizes', 'Chicken Fried Rice Tray', null, false, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":1100}]'),
  ('Family Sizes', 'Seafood Fried Rice Tray', null, false, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":1300}]'),
  ('Family Sizes', 'Top 4 Ng-Wanam Bilao', 'Pancit, lumpia, fried rice, and fried chicken.', false, true, '[{"name":"Good for 6","label":"Good for 6","min":6,"max":6,"price":1450}]'),
  ('Family Sizes', 'Family Meal', 'Fried rice, lumpia, and fried chicken.', false, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":1050}]'),
  ('Family Sizes', 'Birthday Meal', 'Carbonara, spaghetti, lumpia, and garlic bread.', false, true, '[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":1500}]'),
  ('Family Sizes', 'Pork Chopsuey Family', null, false, true, '[{"name":"Good for 15","label":"Good for 15","min":15,"max":15,"price":1700}]'),
  ('Family Sizes', 'Chicken Chopsuey Family', null, false, true, '[{"name":"Good for 15","label":"Good for 15","min":15,"max":15,"price":2200}]'),
  ('Family Sizes', 'Beef Chopsuey Family', null, false, true, '[{"name":"Good for 15","label":"Good for 15","min":15,"max":15,"price":2200}]'),
  ('Family Sizes', 'Pinoy Style Spaghetti', null, false, true, '[{"name":"Family tray","label":"Good for 6-8","min":6,"max":8,"price":1100}]'),
  ('Family Sizes', 'Classic Carbonara', null, false, true, '[{"name":"Family tray","label":"Good for 6-8","min":6,"max":8,"price":1300}]'),
  ('Family Sizes', 'Fried Lumpia Gulay Bilao', null, false, true, '[{"name":"30 pieces","label":"30 pieces","min":1,"max":1,"price":1200}]'),
  ('Family Sizes', 'All In Chicken Bilao', 'Chicken fried rice, chicken lumpia Shanghai, and fried chicken.', false, true, '[{"name":"Good for 6-8","label":"Good for 6-8","min":6,"max":8,"price":1500}]'),
  ('Family Sizes', 'Party Box', 'Bihon guisado, spaghetti, lumpia Shanghai, and chicken tenders.', false, true, '[{"name":"Party box","label":"Party box","min":1,"max":1,"price":2000}]'),
  ('Party Trays - Pre-order', 'Chicken Afritada', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Chicken Tenders', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Chicken Ala King', null, false, true, '[{"name":"Party tray","label":"Good for 10","min":10,"max":10,"price":1700}]'),
  ('Party Trays - Pre-order', 'Garlic Buttered Chicken', null, false, true, '[{"name":"Party tray","label":"Good for 10","min":10,"max":10,"price":1700}]'),
  ('Party Trays - Pre-order', 'Chicken Curry', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Chicken Creamy Mushroom', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Chicken Salpicao', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Chicken Kaldereta', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1900}]'),
  ('Party Trays - Pre-order', 'Pork Kaldereta', null, false, true, '[{"name":"3 kilos","label":"3 kilos","min":null,"max":null,"price":3000}]'),
  ('Party Trays - Pre-order', 'Pork Menudo', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Breaded Pork with Mushroom Gravy and Mashed Potato', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Pork Salpicao', null, false, true, '[{"name":"Party tray","label":"Good for 10-12","min":10,"max":12,"price":1700}]'),
  ('Party Trays - Pre-order', 'Creamy Pork Mushroom', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Filipino Style Pork Steak', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Pork Binagoongan', null, false, true, '[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
  ('Party Trays - Pre-order', 'Lechon Kare-Kare', null, false, true, '[{"name":"Party tray","label":"Good for 10-12","min":10,"max":12,"price":2000}]'),
  ('Party Trays - Pre-order', 'Beef Broccoli', null, false, true, '[{"name":"Party tray","label":"Good for 10-12","min":10,"max":12,"price":2000}]'),
  ('Party Trays - Pre-order', 'Buttered Shrimp', null, false, true, '[{"name":"1 kilo","label":"Per kilo","min":1,"max":1,"price":1800}]'),
  ('Party Trays - Pre-order', 'Sweet and Chili Shrimp', null, false, true, '[{"name":"1 kilo","label":"Per kilo","min":1,"max":1,"price":1800}]'),
  ('Party Trays - Pre-order', 'Seafood Mix Sweet and Chili', null, false, true, '[{"name":"Party tray","label":"Good for 10-12","min":10,"max":12,"price":2300}]'),
  ('Party Trays - Pre-order', 'Crispy Fish Fillet Ala King Sauce', null, false, true, '[{"name":"Party tray","label":"Good for 10-12","min":10,"max":12,"price":1800}]'),
  ('Salo-Salo Trays', 'Ball n Ball', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":800},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":1600}]'),
  ('Salo-Salo Trays', 'Lechon Kawali', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1200},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":2300}]'),
  ('Salo-Salo Trays', 'Sweet and Sour Pork', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1200},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":2300}]'),
  ('Salo-Salo Trays', 'Sweet and Sour Chicken', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1100},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":1600}]'),
  ('Salo-Salo Trays', 'Sweet and Sour Fish Fillet', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1350},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":2600}]'),
  ('Salo-Salo Trays', 'Pork Asado', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1300},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":2600}]'),
  ('Salo-Salo Trays', 'Fried Chicken with Vegetables', null, false, false, '[{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":1600}]'),
  ('Salo-Salo Trays', 'Calamares', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1300},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":2400}]'),
  ('Salo-Salo Trays', 'Camarón Rebusado', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1100},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":2100}]'),
  ('Salo-Salo Trays', 'Pata Tim Special', null, false, false, '[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1800}]'),
  ('Salo-Salo Trays', 'Special Pancit Lechon', null, false, false, '[{"name":"Regular","label":"Good for 12","min":12,"max":12,"price":1300}]'),
  ('Salo-Salo Trays', 'Plain Rice', null, false, false, '[{"name":"Small","label":"Good for 15","min":15,"max":15,"price":600},{"name":"Large","label":"Good for 25","min":25,"max":25,"price":900}]'),
  ('Suki Meals', 'SM2', 'Lumpia, chopsuey, pancit, and fried rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":250}]'),
  ('Suki Meals', 'SM3', 'Fried chicken, chopsuey, pancit, and fried rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":250}]'),
  ('Suki Meals', 'SM4', 'Halo prito, chopsuey, pancit, and fried rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":250}]'),
  ('Suki Meals', 'SM5', 'Calamares, chopsuey, pancit, and fried rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":285}]'),
  ('Suki Meals', 'SM6', 'Pork asado, lumpia, pancit, and fried rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":285}]'),
  ('Suki Meals', 'SM7', 'Pork asado, fried chicken, pancit, and fried rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":285}]'),
  ('Suki Meals', 'SM8', 'Pork asado, lechon kawali, pancit, and fried rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":320}]'),
  ('Pancit Meals', 'PM1', 'Pancit with 4 pieces lumpia.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":150}]'),
  ('Pancit Meals', 'PM2', 'Pancit with fried rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":150}]'),
  ('Pancit Meals', 'PM3', 'Pancit with 1 piece fried chicken.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":175}]'),
  ('Pancit Meals', 'PM4', 'Pancit, 8 pieces lumpia, and plain rice.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":200}]'),
  ('Pancit Meals', 'PM5', 'Pancit, 4 pieces lumpia, and 1 piece fried chicken.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":220}]'),
  ('Plain Rice Meals', 'RM1', '8 pieces lumpia with egg.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":169}]'),
  ('Plain Rice Meals', 'RM2', 'Sweet and sour meatball.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":169}]'),
  ('Plain Rice Meals', 'RM3', '2 pieces breaded pork with egg.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":189}]'),
  ('Plain Rice Meals', 'RM4', '4 pieces lumpia with chopsuey.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":199}]'),
  ('Plain Rice Meals', 'RM5', 'Pork sisig with fried egg.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":199}]'),
  ('Plain Rice Meals', 'RM6', '1 piece fried chicken, 2 pieces karne asado, 2 pieces lechon kawali, and fried egg.', false, false, '[{"name":"Regular","label":"Bento meal","min":1,"max":1,"price":300}]'),
  ('Others', 'Sarsa ng Isda', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":200}]'),
  ('Others', 'Extra Sauce Lumpia Small', null, false, false, '[{"name":"Small","label":"Small","min":1,"max":1,"price":20}]'),
  ('Others', 'Extra Sauce Lumpia Large', null, false, false, '[{"name":"Large","label":"Large","min":1,"max":1,"price":150}]'),
  ('Others', 'Extra Lechon Sauce', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":30}]'),
  ('Others', 'White Pepper', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":20}]'),
  ('Others', 'Toyo', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":10}]'),
  ('Others', 'Chili Garlic', null, false, false, '[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":50}]'),
  ('Others', 'Sealed Spoon and Fork', null, false, false, '[{"name":"Regular","label":"One set","min":1,"max":1,"price":10}]'),
  ('Others', 'Frozen Hilaw Lumpia', null, false, false, '[{"name":"Regular","label":"Regular pack","min":1,"max":1,"price":160}]'),
  ('Others', '1L Toyo', null, false, false, '[{"name":"Regular","label":"1 litre bottle","min":1,"max":1,"price":95}]')
), upserted_items as (
  insert into public.menu_items (category_id, name, description, is_best_seller, requires_preorder)
  select c.id, s.item_name, s.description, s.best_seller, s.preorder
  from menu_seed s join public.categories c on c.name = s.category_name
  on conflict (category_id, name) do update set
    description = excluded.description,
    is_best_seller = excluded.is_best_seller,
    requires_preorder = excluded.requires_preorder,
    is_active = true
  returning id, category_id, name
)
insert into public.menu_variants (menu_item_id, name, serving_label, serving_min, serving_max, price)
select mi.id, v.name, v.label, v.min, v.max, v.price
from menu_seed s
join public.categories c on c.name = s.category_name
join upserted_items mi on mi.category_id = c.id and mi.name = s.item_name
cross join lateral jsonb_to_recordset(s.variants::jsonb) as v(name text, label text, min smallint, max smallint, price numeric)
on conflict (menu_item_id, name) do update set
  serving_label = excluded.serving_label,
  serving_min = excluded.serving_min,
  serving_max = excluded.serving_max,
  price = excluded.price,
  is_active = true;

insert into public.inventory (menu_variant_id, current_stock, minimum_stock)
select id, 25, 5 from public.menu_variants
on conflict (menu_variant_id) do nothing;

select public.apply_seed_menu_images();

-- Accounts and menu only. Orders, payments and deliveries are created through
-- the application; no automatic daily/demo transactions are generated.
