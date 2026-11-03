-- Source: Ng Wanam menus supplied by the client, dated January and May 2026.
-- Stock is intentionally zero until authorized staff record actual available quantities.
insert into public.restaurant_settings (name, address, operating_hours, phone_numbers, facebook_url, delivery_service_areas)
values (
  'Ng Wanam Food House',
  '20D Evangelista St. Barangay 23, Batangas City',
  'Daily, 6:30 AM - 7:30 PM',
  array['(043) 723 2560', '0936-911-9169', '0938-531-8733'],
  'https://www.facebook.com/NgWanamFoodHouse',
  array['Batangas City', 'Bauan', 'Lipa', 'Taal', 'Lemery', 'Mabini']
);

insert into public.categories (name, sort_order) values
  ('Pancit', 1), ('Chicken', 2), ('Pork', 3), ('Seafood', 4),
  ('Appetizer', 5), ('Sandwiches', 6), ('Drinks', 7), ('Dessert', 8),
  ('Family Sizes', 9), ('Party Trays - Pre-order', 10), ('Salo-Salo Trays', 11),
  ('Suki Meals', 12), ('Pancit Meals', 13), ('Plain Rice Meals', 14);

create temporary table menu_seed (
  category_name text, item_name text, description text, best_seller boolean, preorder boolean,
  variants jsonb
) on commit drop;

insert into menu_seed values
('Pancit','Miki Guisado',null,true,false,'[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":110},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":170}]'),
('Pancit','Canton',null,false,false,'[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":130},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":190}]'),
('Pancit','Canton - Bihon',null,false,false,'[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":130},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":190}]'),
('Pancit','Bihon',null,false,false,'[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":130},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":190}]'),
('Pancit','Miki Bihon',null,false,false,'[{"name":"Good for 1","label":"Good for 1","min":1,"max":1,"price":130},{"name":"Good for 3","label":"Good for 3","min":3,"max":3,"price":190}]'),
('Chicken','Fried Chicken',null,true,false,'[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":225},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":450}]'),
('Chicken','Chicken Asado',null,false,false,'[{"name":"Half","label":"Good for 3","min":3,"max":3,"price":225},{"name":"Whole","label":"Good for 6","min":6,"max":6,"price":450}]'),
('Pork','Lumpia Shanghai',null,true,false,'[{"name":"20 pieces","label":"Good for 4","min":4,"max":4,"price":170}]'),
('Seafood','Fish & Chips',null,false,false,'[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":250}]'),
('Appetizer','Fried Lumpia Gulay',null,false,false,'[{"name":"4 pieces","label":"4 pieces","min":1,"max":1,"price":150},{"name":"10 pieces","label":"10 pieces","min":1,"max":1,"price":360},{"name":"15 pieces","label":"15 pieces","min":1,"max":1,"price":540}]'),
('Sandwiches','Cheese Sandwich',null,false,false,'[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":70}]'),
('Drinks','Mismo Size',null,false,false,'[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":30}]'),
('Dessert','Leche Flan',null,false,false,'[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":130}]'),
('Family Sizes','Miki Guisado - Pork Lahok',null,true,false,'[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":550},{"name":"Good for 12","label":"Good for 12","min":12,"max":12,"price":700}]'),
('Family Sizes','Miki Guisado - Chicken Lahok',null,true,false,'[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":600},{"name":"Good for 12","label":"Good for 12","min":12,"max":12,"price":750}]'),
('Family Sizes','Lumpia Shanghai Bilao',null,false,false,'[{"name":"100 pieces","label":"Good for 25 (100 pieces)","min":25,"max":25,"price":950},{"name":"200 pieces","label":"Good for 50 (200 pieces)","min":50,"max":50,"price":1850}]'),
('Family Sizes','Fried Rice Tray',null,false,false,'[{"name":"Good for 8","label":"Good for 8","min":8,"max":8,"price":800},{"name":"Good for 12","label":"Good for 12","min":12,"max":12,"price":1100}]'),
('Family Sizes','Pinoy Style Spaghetti',null,false,false,'[{"name":"Family tray","label":"Good for 6-8","min":6,"max":8,"price":1100}]'),
('Party Trays - Pre-order','Chicken Afritada',null,false,true,'[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1700}]'),
('Party Trays - Pre-order','Chicken Kaldereta',null,false,true,'[{"name":"Party tray","label":"Good for 12-15","min":12,"max":15,"price":1900}]'),
('Party Trays - Pre-order','Pork Kaldereta',null,false,true,'[{"name":"3 kilos","label":"3 kilos","min":null,"max":null,"price":3000}]'),
('Party Trays - Pre-order','Beef Broccoli',null,false,true,'[{"name":"Party tray","label":"Good for 10-12","min":10,"max":12,"price":2000}]'),
('Salo-Salo Trays','Ball n Ball',null,false,false,'[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":800},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":1600}]'),
('Salo-Salo Trays','Lechon Kawali',null,false,false,'[{"name":"Small","label":"Good for 8-10","min":8,"max":10,"price":1200},{"name":"Large","label":"Good for 12-15","min":12,"max":15,"price":2300}]'),
('Salo-Salo Trays','Special Pancit Lechon',null,false,false,'[{"name":"Large","label":"Good for 12","min":12,"max":12,"price":1300}]'),
('Suki Meals','SM1','Lumpia, Fried Chicken, Pancit, Fried Rice, and Fried Siomai',false,false,'[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":250}]'),
('Pancit Meals','PM1','Pancit with 4 pieces Lumpia',false,false,'[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":150}]'),
('Plain Rice Meals','RM1','8 pieces Lumpia with Egg',false,false,'[{"name":"Regular","label":"Regular serving","min":1,"max":1,"price":169}]');

insert into public.menu_items (category_id, name, description, is_best_seller, requires_preorder)
select c.id, s.item_name, s.description, s.best_seller, s.preorder
from menu_seed s join public.categories c on c.name = s.category_name;

insert into public.menu_variants (menu_item_id, name, serving_label, serving_min, serving_max, price)
select mi.id, v.name, v.label, v.min, v.max, v.price
from menu_seed s join public.categories c on c.name = s.category_name
join public.menu_items mi on mi.category_id = c.id and mi.name = s.item_name
cross join lateral jsonb_to_recordset(s.variants) as v(name text, label text, min smallint, max smallint, price numeric);

insert into public.inventory (menu_variant_id, current_stock, reserved_stock, minimum_stock)
select id, 0, 0, 0 from public.menu_variants;
