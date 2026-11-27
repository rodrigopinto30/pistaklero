
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "application_answers": {
                  Row: {
                    "answer_option": number | null,"answer_text": string | null,"application_id": string,"question_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer_option"?: number | null,"answer_text"?: string | null,"application_id": string,"question_id": string
                  }
                  Update: {
                    "answer_option"?: number | null,"answer_text"?: string | null,"application_id"?: string,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_answers_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "application_answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "job_questions"
      referencedColumns: ["id"]
    }
                  ]
                },"application_events": {
                  Row: {
                    "actor_id": string | null,"actor_type": Database["public"]['Enums']["actor_type"],"application_id": string,"created_at": string,"from_status": Database["public"]['Enums']["application_status"] | null,"id": number,"to_status": Database["public"]['Enums']["application_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_type": Database["public"]['Enums']["actor_type"],"application_id": string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["application_status"] | null,"id"?: never,"to_status": Database["public"]['Enums']["application_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_type"?: Database["public"]['Enums']["actor_type"],"application_id"?: string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["application_status"] | null,"id"?: never,"to_status"?: Database["public"]['Enums']["application_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "application_events_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "applications"
      referencedColumns: ["id"]
    }
                  ]
                },"applications": {
                  Row: {
                    "candidate_id": string,"candidate_warned_at": string | null,"closed_at": string | null,"created_at": string,"first_response_at": string | null,"id": string,"job_id": string,"recruiter_reminded_at": string | null,"rejection_message": string | null,"status": Database["public"]['Enums']["application_status"],"status_changed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"candidate_warned_at"?: string | null,"closed_at"?: string | null,"created_at"?: string,"first_response_at"?: string | null,"id"?: string,"job_id": string,"recruiter_reminded_at"?: string | null,"rejection_message"?: string | null,"status"?: Database["public"]['Enums']["application_status"],"status_changed_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"candidate_warned_at"?: string | null,"closed_at"?: string | null,"created_at"?: string,"first_response_at"?: string | null,"id"?: string,"job_id"?: string,"recruiter_reminded_at"?: string | null,"rejection_message"?: string | null,"status"?: Database["public"]['Enums']["application_status"],"status_changed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "applications_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"id": number,"metadata": NonNullable<Json>,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"id"?: never,"metadata"?: NonNullable<Json>,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"candidate_blocked_companies": {
                  Row: {
                    "candidate_id": string,"company_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"company_id": string,"created_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"company_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_blocked_companies_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "candidate_blocked_companies_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"candidate_certifications": {
                  Row: {
                    "candidate_id": string,"created_at": string,"credential_url": string | null,"id": string,"issued_on": string | null,"issuer": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"credential_url"?: string | null,"id"?: string,"issued_on"?: string | null,"issuer"?: string,"name": string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"credential_url"?: string | null,"id"?: string,"issued_on"?: string | null,"issuer"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_certifications_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    }
                  ]
                },"candidate_education": {
                  Row: {
                    "candidate_id": string,"created_at": string,"degree": string,"end_date": string | null,"id": string,"institution": string,"start_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"degree": string,"end_date"?: string | null,"id"?: string,"institution": string,"start_date": string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"degree"?: string,"end_date"?: string | null,"id"?: string,"institution"?: string,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_education_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    }
                  ]
                },"candidate_experiences": {
                  Row: {
                    "candidate_id": string,"company_name": string,"created_at": string,"description": string,"end_date": string | null,"id": string,"start_date": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"company_name": string,"created_at"?: string,"description"?: string,"end_date"?: string | null,"id"?: string,"start_date": string,"title": string
                  }
                  Update: {
                    "candidate_id"?: string,"company_name"?: string,"created_at"?: string,"description"?: string,"end_date"?: string | null,"id"?: string,"start_date"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_experiences_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    }
                  ]
                },"candidate_projects": {
                  Row: {
                    "candidate_id": string,"created_at": string,"description": string,"id": string,"preview_path": string | null,"repo_url": string | null,"title": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"description"?: string,"id"?: string,"preview_path"?: string | null,"repo_url"?: string | null,"title": string,"url"?: string | null
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"description"?: string,"id"?: string,"preview_path"?: string | null,"repo_url"?: string | null,"title"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_projects_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    }
                  ]
                },"candidate_salary_expectations": {
                  Row: {
                    "amount": number,"basis": Database["public"]['Enums']["salary_basis"],"candidate_id": string,"currency": Database["public"]['Enums']["currency"],"period": Database["public"]['Enums']["salary_period"],"updated_at": string,"visibility": Database["public"]['Enums']["salary_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"basis": Database["public"]['Enums']["salary_basis"],"candidate_id": string,"currency": Database["public"]['Enums']["currency"],"period": Database["public"]['Enums']["salary_period"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["salary_visibility"]
                  }
                  Update: {
                    "amount"?: number,"basis"?: Database["public"]['Enums']["salary_basis"],"candidate_id"?: string,"currency"?: Database["public"]['Enums']["currency"],"period"?: Database["public"]['Enums']["salary_period"],"updated_at"?: string,"visibility"?: Database["public"]['Enums']["salary_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_salary_expectations_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: true
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    }
                  ]
                },"candidate_skills": {
                  Row: {
                    "candidate_id": string,"level": Database["public"]['Enums']["skill_level"],"skill_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"level"?: Database["public"]['Enums']["skill_level"],"skill_id": string
                  }
                  Update: {
                    "candidate_id"?: string,"level"?: Database["public"]['Enums']["skill_level"],"skill_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_skills_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "candidate_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"candidates": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability"],"avatar_url": string | null,"bio": string,"city": string | null,"country": string | null,"created_at": string,"full_name": string,"github_url": string | null,"headline": string,"languages": (string)[],"linkedin_url": string | null,"slug": string,"updated_at": string,"user_id": string,"visibility": Database["public"]['Enums']["profile_visibility"],"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability"],"avatar_url"?: string | null,"bio"?: string,"city"?: string | null,"country"?: string | null,"created_at"?: string,"full_name": string,"github_url"?: string | null,"headline"?: string,"languages"?: (string)[],"linkedin_url"?: string | null,"slug": string,"updated_at"?: string,"user_id": string,"visibility"?: Database["public"]['Enums']["profile_visibility"],"website_url"?: string | null
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability"],"avatar_url"?: string | null,"bio"?: string,"city"?: string | null,"country"?: string | null,"created_at"?: string,"full_name"?: string,"github_url"?: string | null,"headline"?: string,"languages"?: (string)[],"linkedin_url"?: string | null,"slug"?: string,"updated_at"?: string,"user_id"?: string,"visibility"?: Database["public"]['Enums']["profile_visibility"],"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidates_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "city": string | null,"country": string | null,"created_at": string,"created_by": string | null,"description": string,"domain": string | null,"id": string,"industry": string | null,"instagram_url": string | null,"linkedin_url": string | null,"logo_path": string | null,"name": string,"size": Database["public"]['Enums']["company_size"] | null,"slug": string,"stage": Database["public"]['Enums']["company_stage"] | null,"status": Database["public"]['Enums']["company_status"],"updated_at": string,"verified_at": string | null,"website_url": string | null,"x_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"country"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"domain"?: string | null,"id"?: string,"industry"?: string | null,"instagram_url"?: string | null,"linkedin_url"?: string | null,"logo_path"?: string | null,"name": string,"size"?: Database["public"]['Enums']["company_size"] | null,"slug": string,"stage"?: Database["public"]['Enums']["company_stage"] | null,"status"?: Database["public"]['Enums']["company_status"],"updated_at"?: string,"verified_at"?: string | null,"website_url"?: string | null,"x_url"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"country"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"domain"?: string | null,"id"?: string,"industry"?: string | null,"instagram_url"?: string | null,"linkedin_url"?: string | null,"logo_path"?: string | null,"name"?: string,"size"?: Database["public"]['Enums']["company_size"] | null,"slug"?: string,"stage"?: Database["public"]['Enums']["company_stage"] | null,"status"?: Database["public"]['Enums']["company_status"],"updated_at"?: string,"verified_at"?: string | null,"website_url"?: string | null,"x_url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"company_invitations": {
                  Row: {
                    "accepted_at": string | null,"company_id": string,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"company_id": string,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"company_id"?: string,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_invitations_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"company_members": {
                  Row: {
                    "company_id": string,"created_at": string,"member_role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"member_role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"member_role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"company_skills": {
                  Row: {
                    "company_id": string,"skill_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"skill_id": string
                  }
                  Update: {
                    "company_id"?: string,"skill_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_skills_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"email_outbox": {
                  Row: {
                    "attempts": number,"created_at": string,"dedupe_key": string | null,"id": number,"last_error": string | null,"locale": Database["public"]['Enums']["app_locale"],"next_attempt_at": string,"payload": NonNullable<Json>,"sent_at": string | null,"status": Database["public"]['Enums']["email_status"],"template": string,"to_email": string,"to_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key"?: string | null,"id"?: never,"last_error"?: string | null,"locale"?: Database["public"]['Enums']["app_locale"],"next_attempt_at"?: string,"payload"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["email_status"],"template": string,"to_email": string,"to_user_id"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"dedupe_key"?: string | null,"id"?: never,"last_error"?: string | null,"locale"?: Database["public"]['Enums']["app_locale"],"next_attempt_at"?: string,"payload"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["email_status"],"template"?: string,"to_email"?: string,"to_user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"job_questions": {
                  Row: {
                    "id": string,"job_id": string,"options": (string)[] | null,"position": number,"prompt": string,"required": boolean,"type": Database["public"]['Enums']["question_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"job_id": string,"options"?: (string)[] | null,"position": number,"prompt": string,"required"?: boolean,"type": Database["public"]['Enums']["question_type"]
                  }
                  Update: {
                    "id"?: string,"job_id"?: string,"options"?: (string)[] | null,"position"?: number,"prompt"?: string,"required"?: boolean,"type"?: Database["public"]['Enums']["question_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_questions_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"job_skills": {
                  Row: {
                    "job_id": string,"skill_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "job_id": string,"skill_id": string
                  }
                  Update: {
                    "job_id"?: string,"skill_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_skills_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "job_skills_skill_id_fkey"
      columns: ["skill_id"]
isOneToOne: false
      referencedRelation: "skills"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "city": string | null,"closed_at": string | null,"company_id": string,"country": string | null,"created_at": string,"created_by": string | null,"description": string,"employment_type": Database["public"]['Enums']["employment_type"],"external_id": string | null,"external_provider": Database["public"]['Enums']["import_provider"] | null,"external_url": string | null,"id": string,"language": Database["public"]['Enums']["app_locale"],"published_at": string | null,"salary_basis": Database["public"]['Enums']["salary_basis"] | null,"salary_currency": Database["public"]['Enums']["currency"] | null,"salary_max": number | null,"salary_min": number | null,"salary_period": Database["public"]['Enums']["salary_period"] | null,"search_vector": unknown,"seniority": Database["public"]['Enums']["seniority"],"slug": string,"source": Database["public"]['Enums']["job_source"],"status": Database["public"]['Enums']["job_status"],"summary": string,"title": string,"updated_at": string,"valid_through": string,"work_mode": Database["public"]['Enums']["work_mode"],"is_job_public": boolean | null
                  }
                  ComputedFields: "is_job_public"
                  Insert: {
                    "city"?: string | null,"closed_at"?: string | null,"company_id": string,"country"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"employment_type": Database["public"]['Enums']["employment_type"],"external_id"?: string | null,"external_provider"?: Database["public"]['Enums']["import_provider"] | null,"external_url"?: string | null,"id"?: string,"language": Database["public"]['Enums']["app_locale"],"published_at"?: string | null,"salary_basis"?: Database["public"]['Enums']["salary_basis"] | null,"salary_currency"?: Database["public"]['Enums']["currency"] | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_period"?: Database["public"]['Enums']["salary_period"] | null,"search_vector"?: unknown,"seniority": Database["public"]['Enums']["seniority"],"slug"?: string,"source"?: Database["public"]['Enums']["job_source"],"status"?: Database["public"]['Enums']["job_status"],"summary"?: string,"title": string,"updated_at"?: string,"valid_through": string,"work_mode": Database["public"]['Enums']["work_mode"]
                  }
                  Update: {
                    "city"?: string | null,"closed_at"?: string | null,"company_id"?: string,"country"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"employment_type"?: Database["public"]['Enums']["employment_type"],"external_id"?: string | null,"external_provider"?: Database["public"]['Enums']["import_provider"] | null,"external_url"?: string | null,"id"?: string,"language"?: Database["public"]['Enums']["app_locale"],"published_at"?: string | null,"salary_basis"?: Database["public"]['Enums']["salary_basis"] | null,"salary_currency"?: Database["public"]['Enums']["currency"] | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_period"?: Database["public"]['Enums']["salary_period"] | null,"search_vector"?: unknown,"seniority"?: Database["public"]['Enums']["seniority"],"slug"?: string,"source"?: Database["public"]['Enums']["job_source"],"status"?: Database["public"]['Enums']["job_status"],"summary"?: string,"title"?: string,"updated_at"?: string,"valid_through"?: string,"work_mode"?: Database["public"]['Enums']["work_mode"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email_notifications": boolean,"id": string,"locale": Database["public"]['Enums']["app_locale"],"role": Database["public"]['Enums']["user_role"],"suspended_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email_notifications"?: boolean,"id": string,"locale"?: Database["public"]['Enums']["app_locale"],"role": Database["public"]['Enums']["user_role"],"suspended_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email_notifications"?: boolean,"id"?: string,"locale"?: Database["public"]['Enums']["app_locale"],"role"?: Database["public"]['Enums']["user_role"],"suspended_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"skills": {
                  Row: {
                    "category": Database["public"]['Enums']["skill_category"],"id": string,"name_en": string,"name_es": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["skill_category"],"id"?: string,"name_en": string,"name_es": string,"slug": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["skill_category"],"id"?: string,"name_en"?: string,"name_es"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_locale": Database["public"]['Enums']["app_locale"],"p_token": string }; Returns: string
                           },
"apply_to_job":
{ Args: { "p_answers"?: Json,"p_job_id": string }; Returns: string
                           },
"auth_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"can_edit_job":
{ Args: { "p_job_id": string }; Returns: boolean
                           },
"can_view_application":
{ Args: { "p_application_id": string }; Returns: boolean
                           },
"can_view_candidate":
{ Args: { "p_candidate_id": string }; Returns: boolean
                           },
"candidate_missing_requirements":
{ Args: { "p_candidate_id": string }; Returns: (string)[]
                           },
"claim_email_batch":
{ Args: { "p_limit": number }; Returns: {
              "attempts": number,
"created_at": string,
"dedupe_key": string | null,
"id": number,
"last_error": string | null,
"locale": Database["public"]['Enums']["app_locale"],
"next_attempt_at": string,
"payload": NonNullable<Json>,
"sent_at": string | null,
"status": Database["public"]['Enums']["email_status"],
"template": string,
"to_email": string,
"to_user_id": string | null
            }[]
                          SetofOptions: {
        from: "*"
        to: "email_outbox"
        isOneToOne: false
        isSetofReturn: true
      } },
"create_company":
{ Args: { "p_company_name": string,"p_locale": Database["public"]['Enums']["app_locale"],"p_website_url": string }; Returns: string
                           },
"create_invitation":
{ Args: { "p_email": string,"p_token_hash": string }; Returns: string
                           },
"domain_from_url":
{ Args: { "p_url": string }; Returns: string
                           },
"email_matches_domain":
{ Args: { "p_domain": string,"p_email": string }; Returns: boolean
                           },
"enqueue_email":
{ Args: { "p_dedupe_key"?: string,"p_locale": Database["public"]['Enums']["app_locale"],"p_payload": Json,"p_template": string,"p_to_email": string,"p_to_user_id": string }; Returns: undefined
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_company_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_free_email_domain":
{ Args: { "p_domain": string }; Returns: boolean
                           },
"is_job_public":
{ Args: { "p_job": Omit<Database["public"]['Tables']["jobs"]['Row'], Database["public"]['Tables']["jobs"]['ComputedFields']> }; Returns: boolean
                           },
"list_company_members":
{ Args: Record<PropertyKey, never>; Returns: {
              "email": string,"joined_at": string,"member_role": Database["public"]['Enums']["member_role"],"user_id": string
            }[]
                           },
"my_company_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"onboard_candidate":
{ Args: { "p_full_name": string,"p_headline": string,"p_locale": Database["public"]['Enums']["app_locale"] }; Returns: undefined
                           },
"random_slug":
{ Args: { "p_value": string }; Returns: string
                           },
"refresh_job_search_vector":
{ Args: { "p_job_id": string }; Returns: undefined
                           },
"search_jobs":
{ Args: { "p_country"?: string,"p_currency"?: Database["public"]['Enums']["currency"],"p_employment_types"?: (Database["public"]['Enums']["employment_type"])[],"p_language"?: Database["public"]['Enums']["app_locale"],"p_limit"?: number,"p_offset"?: number,"p_query"?: string,"p_salary_visible"?: boolean,"p_seniorities"?: (Database["public"]['Enums']["seniority"])[],"p_work_modes"?: (Database["public"]['Enums']["work_mode"])[] }; Returns: {
              "city": string,"company_logo_path": string,"company_name": string,"company_slug": string,"company_verified": boolean,"country": string,"employment_type": Database["public"]['Enums']["employment_type"],"id": string,"language": Database["public"]['Enums']["app_locale"],"published_at": string,"salary_basis": Database["public"]['Enums']["salary_basis"],"salary_currency": Database["public"]['Enums']["currency"],"salary_max": number,"salary_min": number,"salary_period": Database["public"]['Enums']["salary_period"],"seniority": Database["public"]['Enums']["seniority"],"skills": Json,"slug": string,"source": Database["public"]['Enums']["job_source"],"title": string,"total_count": number,"work_mode": Database["public"]['Enums']["work_mode"]
            }[]
                           },
"set_company_logo":
{ Args: { "p_path": string }; Returns: undefined
                           },
"slugify":
{ Args: { "p_value": string }; Returns: string
                           },
"update_company_website":
{ Args: { "p_website_url": string }; Returns: undefined
                           },
"update_member":
{ Args: { "p_action": string,"p_user_id": string }; Returns: undefined
                           },
"withdraw_application":
{ Args: { "p_application_id": string }; Returns: undefined
                           },
"write_audit_log":
{ Args: { "p_action": string,"p_metadata"?: Json,"p_target_id"?: string,"p_target_type"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "actor_type": "candidate"|"recruiter"|"system","app_locale": "es"|"en","application_status": "received"|"in_review"|"interview"|"hired"|"rejected"|"no_response"|"withdrawn","availability": "immediate"|"two_weeks"|"freelance_only"|"not_looking","company_size": "1-10"|"11-50"|"51-200"|"201-1000"|"1000+","company_stage": "pre_seed"|"seed"|"series_a_plus"|"bootstrapped"|"established","company_status": "unclaimed"|"active"|"suspended","currency": "USD"|"ARS"|"EUR"|"BRL"|"MXN"|"CLP"|"COP"|"UYU","email_status": "pending"|"sent"|"failed","employment_type": "full_time"|"part_time"|"contract"|"internship"|"freelance","import_provider": "manual"|"greenhouse"|"lever"|"ashby"|"workable","job_source": "native"|"imported","job_status": "draft"|"published"|"closed"|"hidden","member_role": "owner"|"member","profile_visibility": "companies_only"|"public"|"hidden","question_type": "short_text"|"single_choice","salary_basis": "gross"|"net","salary_period": "hour"|"month"|"year","salary_visibility": "private"|"applied_companies","seniority": "trainee"|"junior"|"semi_senior"|"senior"|"lead","skill_category": "language"|"framework"|"tool"|"data"|"design"|"marketing"|"soft","skill_level": "basic"|"intermediate"|"advanced"|"expert","user_role": "candidate"|"recruiter"|"admin","work_mode": "remote"|"hybrid"|"onsite"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "actor_type": ["candidate", "recruiter", "system"],"app_locale": ["es", "en"],"application_status": ["received", "in_review", "interview", "hired", "rejected", "no_response", "withdrawn"],"availability": ["immediate", "two_weeks", "freelance_only", "not_looking"],"company_size": ["1-10", "11-50", "51-200", "201-1000", "1000+"],"company_stage": ["pre_seed", "seed", "series_a_plus", "bootstrapped", "established"],"company_status": ["unclaimed", "active", "suspended"],"currency": ["USD", "ARS", "EUR", "BRL", "MXN", "CLP", "COP", "UYU"],"email_status": ["pending", "sent", "failed"],"employment_type": ["full_time", "part_time", "contract", "internship", "freelance"],"import_provider": ["manual", "greenhouse", "lever", "ashby", "workable"],"job_source": ["native", "imported"],"job_status": ["draft", "published", "closed", "hidden"],"member_role": ["owner", "member"],"profile_visibility": ["companies_only", "public", "hidden"],"question_type": ["short_text", "single_choice"],"salary_basis": ["gross", "net"],"salary_period": ["hour", "month", "year"],"salary_visibility": ["private", "applied_companies"],"seniority": ["trainee", "junior", "semi_senior", "senior", "lead"],"skill_category": ["language", "framework", "tool", "data", "design", "marketing", "soft"],"skill_level": ["basic", "intermediate", "advanced", "expert"],"user_role": ["candidate", "recruiter", "admin"],"work_mode": ["remote", "hybrid", "onsite"]
          }
        }
} as const
