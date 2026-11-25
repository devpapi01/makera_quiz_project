-- Persist and validate the project SWOT/FFOM as the final assessment step.
alter table public.assessments
  add column if not exists swot jsonb not null default
  '{"strengths":["","",""],"weaknesses":["","",""],"opportunities":["","",""],"threats":["","",""]}'::jsonb
  check (jsonb_typeof(swot) = 'object');

drop function if exists public.submit_assessment(uuid, jsonb, jsonb);

create function public.submit_assessment(
  assessment_id uuid,
  submitted_responses jsonb,
  submitted_reflections jsonb,
  submitted_swot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  answer_count integer;
  total_score integer;
  global_score integer;
  profile_index integer;
  filled_count integer;
  swot_section record;
  profile_names text[] := array[
    'Potentiel à découvrir',
    'Potentiel à éveiller',
    'Potentiel en construction',
    'Potentiel prometteur',
    'Potentiel affirmé',
    'Potentiel élevé'
  ];
  profile_readings text[] := array[
    'L’entrepreneuriat est encore éloigné du profil actuel. Le découvrir pas à pas, avec un accompagnement rapproché.',
    'Quelques bases existent. Une formation et un accompagnement sont nécessaires avant de se lancer.',
    'Des bases réelles mais encore fragiles. Travailler en priorité les aspects les plus faibles.',
    'Un profil d’entrepreneur qui prend forme. Consolider les points faibles pour gagner en solidité.',
    'Un bon profil d’entrepreneur. Consolider les derniers points faibles et passer à l’étape suivante.',
    'Un profil entrepreneurial très solide. Passer à l’action et viser la croissance.'
  ];
begin
  if jsonb_typeof(submitted_responses) <> 'array'
    or jsonb_array_length(submitted_responses) <> 8
    or jsonb_typeof(submitted_reflections) <> 'array'
    or jsonb_array_length(submitted_reflections) <> 8 then
    raise exception 'Les huit dimensions sont requises.' using errcode = '22023';
  end if;
  if exists(
    select 1 from jsonb_array_elements(submitted_reflections) as reflection(value)
    where jsonb_typeof(reflection.value) is distinct from 'string'
      or char_length(reflection.value #>> '{}') > 2000
  ) then
    raise exception 'Chaque réflexion doit être un texte de 2 000 caractères maximum.' using errcode = '22023';
  end if;

  if exists(
    select 1
    from jsonb_array_elements(submitted_responses) as dimension(value)
    where jsonb_typeof(dimension.value) <> 'array'
      or case when jsonb_typeof(dimension.value) = 'array'
        then jsonb_array_length(dimension.value) <> 7 else false end
  ) then
    raise exception 'Chaque dimension doit contenir sept affirmations.' using errcode = '22023';
  end if;

  select count(*), coalesce(sum((answer.value #>> '{}')::integer), 0)
    into answer_count, total_score
    from jsonb_array_elements(submitted_responses) as dimension(value)
    cross join lateral jsonb_array_elements(dimension.value) as answer(value)
    where jsonb_typeof(answer.value) = 'number'
      and answer.value #>> '{}' ~ '^[0-5]$';
  if answer_count <> 56 then
    raise exception 'Les 56 réponses doivent être comprises entre 0 et 5.' using errcode = '22023';
  end if;

  if jsonb_typeof(submitted_swot) is distinct from 'object' then
    raise exception 'Les quatre rubriques de l’analyse SWOT sont requises.' using errcode = '22023';
  end if;
  if jsonb_object_length(submitted_swot) <> 4
    or not (submitted_swot ?& array['strengths','weaknesses','opportunities','threats']) then
    raise exception 'Les quatre rubriques de l’analyse SWOT sont requises.' using errcode = '22023';
  end if;

  for swot_section in select key, value from jsonb_each(submitted_swot) loop
    if jsonb_typeof(swot_section.value) <> 'array'
      or case when jsonb_typeof(swot_section.value) = 'array'
        then jsonb_array_length(swot_section.value) <> 3 else false end then
      raise exception 'Chaque rubrique SWOT doit contenir trois champs.' using errcode = '22023';
    end if;
    if exists(
      select 1 from jsonb_array_elements(swot_section.value) as entry(value)
      where jsonb_typeof(entry.value) <> 'string'
        or char_length(entry.value #>> '{}') > 500
    ) then
      raise exception 'Chaque élément SWOT doit être du texte de 500 caractères maximum.' using errcode = '22023';
    end if;
    select count(*) into filled_count
      from jsonb_array_elements(swot_section.value) as entry(value)
      where char_length(trim(entry.value #>> '{}')) > 0;
    if filled_count < 2 then
      raise exception 'Chaque rubrique SWOT doit comporter au moins deux éléments.' using errcode = '22023';
    end if;
  end loop;

  global_score := round(total_score::numeric / 280 * 100)::integer;
  profile_index := least(5, floor(global_score::numeric / 100 * 6)::integer) + 1;
  update public.assessments
    set responses = submitted_responses,
        reflections = submitted_reflections,
        swot = submitted_swot,
        status = 'completed',
        completed_at = now(),
        updated_at = now(),
        result = jsonb_build_object(
          'score', global_score,
          'level', profile_index - 1,
          'profile', profile_names[profile_index],
          'reading', profile_readings[profile_index]
        )
    where id = assessment_id and owner_id = auth.uid() and status = 'in_progress';
  if not found then
    raise exception 'Passation inaccessible ou déjà terminée.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'score', global_score,
    'level', profile_index - 1,
    'profile', profile_names[profile_index],
    'reading', profile_readings[profile_index]
  );
end;
$$;

revoke all on function public.submit_assessment(uuid, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.submit_assessment(uuid, jsonb, jsonb, jsonb)
  to authenticated;
