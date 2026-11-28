begin;
\ir ../support/helpers.inc

select plan(8);

-- El texto sin formato (igual que plainInline en la aplicación) ------------------------------
select is(public.plain_inline('**Cómo** *armé* <u>mi</u> ~~primer~~ <span data-color="red">CV</span> <mark data-highlight="yellow">ya</mark>'),
  'Cómo armé mi primer CV ya', 'plain_inline saca negrita, cursiva, subrayado, tachado, colores y resaltado');
select is(public.plain_inline('5\*3 = 15 y C\_plus 🎉'), '5*3 = 15 y C_plus 🎉', 'deja los caracteres escapados tal cual y los emojis');
select is(public.plain_inline('Q&amp;A: &lt;html&gt;'), 'Q&A: <html>', 'decodifica las entidades');
select is(public.plain_inline('  Cómo preparé mi primera entrevista  '), 'Cómo preparé mi primera entrevista', 'un título sin formato queda igual');

-- Una publicación con el título con formato ----------------------------------------------------
select tests.create_user('tita@titulos.pgtap.test') as tita \gset
select tests.authenticate_as(:'tita');
select public.onboard_candidate('Tita', '', 'Titulares', '', 'es');
select public.create_post('**Cómo** armé mi <span data-color="red">CV</span>', 'Un cuerpo con suficiente texto para publicar.', 'es') as slug \gset
select matches(:'slug'::text, '^como-arme-mi-cv-[0-9a-f]{6}$', 'el slug sale del título sin formato');
reset role;

select tests.authenticate_as_anon();
select is((select title from public.post_cards() where slug = :'slug'), '**Cómo** armé mi <span data-color="red">CV</span>', 'la tarjeta trae el título con formato');
select is((select count(*)::int from public.post_cards(p_query => 'como arme mi cv') where slug = :'slug'), 1, 'la búsqueda encuentra el título sin mirar el formato');
reset role;

select is((select title_plain from public.posts where slug = :'slug'), 'Cómo armé mi CV', 'title_plain lo calcula la base');

select * from finish();
rollback;
