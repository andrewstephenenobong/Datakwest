import { supabase } from './supabase'

export async function getLearnerSkillTree(careerPathSlug = null) {
  const { data, error } = await supabase.rpc('get_learner_skill_tree', {
    p_career_path_slug: careerPathSlug,
  })

  return { tree: data || { career_paths: [] }, error }
}
