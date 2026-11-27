begin;
\ir ../support/helpers.inc

select plan(18);

select tests.create_user('ana@posts.pgtap.test') as ana \gset
select tests.create_user('rrhh@posts.pgtap.test') as rrhh \gset
select tests.create_profile('admin@posts.pgtap.test', 'admin') as admin \gset
select tests.create_profile('c1@posts.pgtap.test', 'candidate') as c1 \gset
select tests.create_profile('c2@posts.pgtap.test', 'candidate') as c2 \gset
select tests.create_profile('c3@posts.pgtap.test', 'candidate') as c3 \gset

-- Una candidata con el perfil oculto publica un consejo ---------------------------------
select tests.authenticate_as(:'ana');
select public.onboard_candidate('Ana', '', 'Consejos', '', 'es');
update public.candidates set visibility = 'hidden' where user_id = auth.uid();
select public.create_post('Cómo armar tu CV', E'## Tres claves\n\n- **Corto**: una página.\n- Con [enlaces](https://ana.dev).', 'es') as slug \gset
select matches(:'slug'::text, '^como-armar-tu-cv-[0-9a-f]{6}$', 'la publicación tiene un slug legible');
select is((select excerpt from public.posts where slug = :'slug'), 'Tres claves Corto: una página. Con enlaces.', 'el resumen sale sin marcas de Markdown');
select throws_ok($$insert into public.posts (author_id, slug, title, body) values (auth.uid(), 'x', 'Título largo', 'Un cuerpo bastante largo.')$$, '42501', null, 'no se inserta directo: solo con create_post');
reset role;

select tests.authenticate_as_anon();
select is((select title from public.post_cards() where slug = :'slug'), 'Cómo armar tu CV', 'se ve sin sesión');
select is((select author_name from public.post_cards() where slug = :'slug'), 'Ana Consejos', 'con el nombre de quien la escribió');
select is((select author_profile_slug from public.post_cards() where slug = :'slug'), null, 'pero sin enlace a un perfil oculto');
select is((select full_name from public.people where user_id = :'ana'), 'Ana Consejos', 'publicar hace visible el nombre');
reset role;

-- Un reclutador también publica: su nombre lleva a la empresa --------------------------
select tests.authenticate_as(:'rrhh');
select public.onboard_recruiter('Rita', '', 'Reclutadora', 'Consejera SA', 'https://posts.pgtap.test', 'es') is not null as ok_company;
select public.create_post('Qué miro en una entrevista', 'Que me cuenten un proyecto propio de punta a punta.', 'es') as rslug \gset
select is((select author_company_name from public.post_cards() where slug = :'rslug'), 'Consejera SA', 'la tarjeta muestra la empresa del reclutador');
select throws_ok(format($$select public.update_post(id, 'Otro título', 'Otro cuerpo bastante largo.', 'es') from public.posts where slug = %L$$, :'slug'), 'P0001', 'not_found', 'nadie edita lo que escribió otra persona');
reset role;

-- Likes y guardados ----------------------------------------------------------------------
select id as post from public.posts where slug = :'slug' \gset
select tests.authenticate_as(:'rrhh');
select is(public.toggle_post_like(:'post'), true, 'dar like');
select is((select likes_count from public.posts where id = :'post'), 1, 'el contador sube');
select is(public.toggle_post_like(:'post'), false, 'tocar de nuevo saca el like');
select is(public.toggle_saved_post(:'post'), true, 'guardar una publicación');
select is((select saved from public.post_cards() where id = :'post'), true, 'la tarjeta sabe que la guardé');
reset role;

-- Denuncias: tres la ocultan y el admin la restaura --------------------------------------
select tests.authenticate_as(:'c1'); select public.report_post(:'post', 'spam'); reset role;
select tests.authenticate_as(:'c2'); select public.report_post(:'post', 'spam'); reset role;
select tests.authenticate_as(:'c3'); select public.report_post(:'post', 'offensive'); reset role;
select tests.authenticate_as_anon();
select is((select count(*)::int from public.posts where id = :'post'), 0, 'con 3 denuncias queda oculta');
reset role;
select tests.authenticate_as(:'admin');
select public.admin_restore_post(:'post');
reset role;
select tests.authenticate_as_anon();
select is((select count(*)::int from public.posts where id = :'post'), 1, 'el admin la vuelve a publicar');
reset role;

-- Límite diario ------------------------------------------------------------------------------
select tests.authenticate_as(:'ana');
select public.create_post('Consejo ' || n, 'Un consejo con suficiente texto.', 'es') from generate_series(1, 4) n;
select throws_ok($$select public.create_post('Uno más', 'Un consejo con suficiente texto.', 'es')$$, 'P0001', 'rate_limited', 'hasta 5 publicaciones por día');
select lives_ok(format($$select public.delete_post(%L)$$, :'post'), 'quien la escribió la puede borrar');
reset role;

select * from finish();
rollback;
