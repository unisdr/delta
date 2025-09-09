-- Custom SQL migration file, put your code below! --
INSERT INTO public.super_admin_users(
	first_name, last_name, email, password)
	VALUES ('admin', 'admin', 'admin@admin.com', crypt('pvDT0g8Qsa36', gen_salt('bf', 10)));