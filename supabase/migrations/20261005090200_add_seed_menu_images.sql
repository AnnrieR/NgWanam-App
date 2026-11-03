create or replace function public.apply_seed_menu_images()
returns void language sql as $$
with image_map (category_name, item_name, image_url) as (values
  ('Pancit', 'Miki Guisado', '/menu-images/PANCIT/miki guisado final.png'),
  ('Pancit', 'Canton', '/menu-images/PANCIT/canton final.png'),
  ('Pancit', 'Bihon', '/menu-images/PANCIT/bihon final.png'),
  ('Pancit', 'Chinese Lomi', '/menu-images/PANCIT/lomi final.png'),
  ('Pancit', 'Pork Mami', '/menu-images/PANCIT/pork mami final.png'),
  ('Chicken', 'Fried Chicken', '/menu-images/CHICKEN/Fried Chicken.png'),
  ('Chicken', 'Chicken Asado', '/menu-images/CHICKEN/Chicken Asado.png'),
  ('Chicken', 'Chop Chicken', '/menu-images/CHICKEN/Chop Chicken.png'),
  ('Chicken', 'Boneless Chicken with Ham', '/menu-images/CHICKEN/Boneless Chicken w_ ham.png'),
  ('Chicken', 'Fried Chicken with Vegetables (Hong Kong Style)', '/menu-images/CHICKEN/Fried Chicken W_ Vegetables.png'),
  ('Chicken', 'Sweet and Sour Chicken', '/menu-images/CHICKEN/Sweet & Sour Chicken.png'),
  ('Pork', 'Lumpia Shanghai', '/menu-images/PORK/Lumpia.png'),
  ('Pork', 'Pork Liver with Greenpeas', '/menu-images/PORK/Pork liver w_ Greenpeas.png'),
  ('Pork', 'Halo Guisado', '/menu-images/PORK/halo guisado.png'),
  ('Pork', 'Halo Prito', '/menu-images/PORK/Halo Prito.png'),
  ('Pork', 'Lechon Kawali', '/menu-images/PORK/Lechon Kawali.png'),
  ('Pork', 'Lechon with Vegetables', '/menu-images/PORK/Lechon w_ Vegetables.png'),
  ('Pork', 'Sweet and Sour Pork', '/menu-images/PORK/Sweet & Sour Pork.png'),
  ('Pork', 'Pork Sisig', '/menu-images/PORK/Pork Sisig.png'),
  ('Pork', 'Pata Tim Special', '/menu-images/PORK/Pata Tim Special.png'),
  ('Seafood', 'Fried Shrimp with Sweet and Sour Sauce', '/menu-images/SEAFOOD/Fried Shrimp w_ Sweet & Sour Sauce.png'),
  ('Vegetable', 'Pork Chopsuey', '/menu-images/VEGETABLE/pork chopseuy final.png'),
  ('Vegetable', 'Shrimp Chopsuey', '/menu-images/VEGETABLE/shrimp chopseuy final.png'),
  ('Vegetable', 'Pork Ampalaya', '/menu-images/VEGETABLE/pork ampalaya final.png'),
  ('Vegetable', 'Beef with Ampalaya', '/menu-images/VEGETABLE/beef ampalaya final.png'),
  ('Rice', 'Fried Rice', '/menu-images/RICE/Fried rice.png'),
  ('Soup', 'Wonton Soup', '/menu-images/SOUP/wonton soup.png'),
  ('Soup', 'Crab and Corn Soup', '/menu-images/SOUP/crab & corn soup.png'),
  ('Appetizer', 'Fried Lumpia Gulay', '/menu-images/APPETIZER/LUMPIA GULAY.png'),
  ('Appetizer', 'Chicharon Bulaklak', '/menu-images/APPETIZER/Chicharon Bulaklak.png'),
  ('Appetizer', 'Tokwa''t Baboy', '/menu-images/APPETIZER/Tokwa_t baboy.png'),
  ('Sandwiches', 'Chicken Sandwich', '/menu-images/SANDWICHES/chicken sandwich.png'),
  ('Sandwiches', 'Ham and Cheese Sandwich', '/menu-images/SANDWICHES/ham & cheese sandwich.png'),
  ('Sandwiches', 'Ham and Egg Sandwich', '/menu-images/SANDWICHES/ham & egg sandwich.png'),
  ('Dessert', 'Leche Flan', '/menu-images/DESSERT/Leche Flan.png'),
  ('Family Sizes', 'Miki Guisado - Pork Lahok', '/menu-images/FAMILY SIZE/Miki-guisado.png'),
  ('Family Sizes', 'Miki-Bihon / Canton-Bihon / Bihon / Canton - Pork Lahok', '/menu-images/FAMILY SIZE/Canton-bihon.png'),
  ('Family Sizes', 'Lumpia Shanghai Bilao', '/menu-images/FAMILY SIZE/LUMPIA BILAO_.png'),
  ('Family Sizes', 'Fried Chicken Bilao', '/menu-images/FAMILY SIZE/FRIED CHICKEN BILAO.png'),
  ('Family Sizes', 'Fried Rice Tray', '/menu-images/FAMILY SIZE/FRIED RICE TRAY.png'),
  ('Family Sizes', 'Top 4 Ng-Wanam Bilao', '/menu-images/FAMILY SIZE/FAMILY SIZES TOP 4 BILAO_.png'),
  ('Family Sizes', 'Birthday Meal', '/menu-images/BIRTHDAY MEAL/BIRTHDAY MEAL_.png'),
  ('Family Sizes', 'All In Chicken Bilao', '/menu-images/FAMILY SIZE/ALL IN CHICKEN BILAO_.png'),
  ('Party Trays - Pre-order', 'Chicken Afritada', '/menu-images/PARTY TRAY/chicken afritada party tray.png'),
  ('Party Trays - Pre-order', 'Chicken Ala King', '/menu-images/PARTY TRAY/chicken ala king party tray.png'),
  ('Party Trays - Pre-order', 'Breaded Pork with Mushroom Gravy and Mashed Potato', '/menu-images/PARTY TRAY/breaded pork w mashed potato party tray.png'),
  ('Party Trays - Pre-order', 'Creamy Pork Mushroom', '/menu-images/PARTY TRAY/creamy mushroom pork party tray.png'),
  ('Party Trays - Pre-order', 'Pork Binagoongan', '/menu-images/PARTY TRAY/pork binagoongan party tray.png'),
  ('Salo-Salo Trays', 'Ball n Ball', '/menu-images/SALO-SALO TRAY/Ball n Ball.png'),
  ('Pancit Meals', 'PM1', '/menu-images/PANCIT MEALS/Pancit Meal 1 PM 1.png'),
  ('Pancit Meals', 'PM2', '/menu-images/PANCIT MEALS/Pancit Meal 2 PM 2.png'),
  ('Pancit Meals', 'PM3', '/menu-images/PANCIT MEALS/Pancit Meal 3 PM 3.png'),
  ('Pancit Meals', 'PM4', '/menu-images/PANCIT MEALS/Pancit Meal 4 PM_.png'),
  ('Pancit Meals', 'PM5', '/menu-images/PANCIT MEALS/Pancit Meal 5 PM 5.png'),
  ('Plain Rice Meals', 'RM1', '/menu-images/RICE MEALS/rm1 final.png'),
  ('Plain Rice Meals', 'RM2', '/menu-images/RICE MEALS/rm2.png'),
  ('Plain Rice Meals', 'RM5', '/menu-images/RICE MEALS/rm5 final.png')
)
update public.menu_items mi
set image_url = image_map.image_url
from image_map
join public.categories c on c.name = image_map.category_name
where mi.category_id = c.id and mi.name = image_map.item_name;
$$;

revoke execute on function public.apply_seed_menu_images() from public, anon, authenticated;
