
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
                },"auth_throttle": {
                  Row: {
                    "failures": number,"key": string,"locked_until": string | null,"updated_at": string,"window_started_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "failures"?: number,"key": string,"locked_until"?: string | null,"updated_at"?: string,"window_started_at"?: string
                  }
                  Update: {
                    "failures"?: number,"key"?: string,"locked_until"?: string | null,"updated_at"?: string,"window_started_at"?: string
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
                },"candidate_profile_views": {
                  Row: {
                    "candidate_id": string,"created_at": string,"viewed_on": string,"viewer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"viewed_on"?: string,"viewer_id": string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"viewed_on"?: string,"viewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidate_profile_views_candidate_id_fkey"
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
                    "availability": Database["public"]['Enums']["availability"],"bio": string,"city": string | null,"country": string | null,"created_at": string,"github_url": string | null,"headline": string,"languages": (string)[],"linkedin_url": string | null,"setup_completed_at": string | null,"slug": string,"updated_at": string,"user_id": string,"visibility": Database["public"]['Enums']["profile_visibility"],"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability"],"bio"?: string,"city"?: string | null,"country"?: string | null,"created_at"?: string,"github_url"?: string | null,"headline"?: string,"languages"?: (string)[],"linkedin_url"?: string | null,"setup_completed_at"?: string | null,"slug": string,"updated_at"?: string,"user_id": string,"visibility"?: Database["public"]['Enums']["profile_visibility"],"website_url"?: string | null
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability"],"bio"?: string,"city"?: string | null,"country"?: string | null,"created_at"?: string,"github_url"?: string | null,"headline"?: string,"languages"?: (string)[],"linkedin_url"?: string | null,"setup_completed_at"?: string | null,"slug"?: string,"updated_at"?: string,"user_id"?: string,"visibility"?: Database["public"]['Enums']["profile_visibility"],"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidates_person_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "people"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "candidates_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "city": string | null,"country": string | null,"cover_path": string | null,"created_at": string,"created_by": string | null,"description": string,"domain": string | null,"id": string,"industry": string | null,"instagram_url": string | null,"likes_count": number,"linkedin_url": string | null,"logo_path": string | null,"name": string,"setup_completed_at": string | null,"size": Database["public"]['Enums']["company_size"] | null,"slug": string,"stage": Database["public"]['Enums']["company_stage"] | null,"status": Database["public"]['Enums']["company_status"],"updated_at": string,"verified_at": string | null,"website_url": string | null,"x_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string | null,"country"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"domain"?: string | null,"id"?: string,"industry"?: string | null,"instagram_url"?: string | null,"likes_count"?: number,"linkedin_url"?: string | null,"logo_path"?: string | null,"name": string,"setup_completed_at"?: string | null,"size"?: Database["public"]['Enums']["company_size"] | null,"slug": string,"stage"?: Database["public"]['Enums']["company_stage"] | null,"status"?: Database["public"]['Enums']["company_status"],"updated_at"?: string,"verified_at"?: string | null,"website_url"?: string | null,"x_url"?: string | null
                  }
                  Update: {
                    "city"?: string | null,"country"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"domain"?: string | null,"id"?: string,"industry"?: string | null,"instagram_url"?: string | null,"likes_count"?: number,"linkedin_url"?: string | null,"logo_path"?: string | null,"name"?: string,"setup_completed_at"?: string | null,"size"?: Database["public"]['Enums']["company_size"] | null,"slug"?: string,"stage"?: Database["public"]['Enums']["company_stage"] | null,"status"?: Database["public"]['Enums']["company_status"],"updated_at"?: string,"verified_at"?: string | null,"website_url"?: string | null,"x_url"?: string | null
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
                },"company_likes": {
                  Row: {
                    "company_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_likes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
                },"company_response_stats": {
                  Row: {
                    "badge": Database["public"]['Enums']["response_badge"],"company_id": string,"computed_at": string,"median_first_response_hours": number | null,"responded_within_14d_pct": number | null,"window_applications": number
                  }
                  ComputedFields: never
                  Insert: {
                    "badge"?: Database["public"]['Enums']["response_badge"],"company_id": string,"computed_at"?: string,"median_first_response_hours"?: number | null,"responded_within_14d_pct"?: number | null,"window_applications"?: number
                  }
                  Update: {
                    "badge"?: Database["public"]['Enums']["response_badge"],"company_id"?: string,"computed_at"?: string,"median_first_response_hours"?: number | null,"responded_within_14d_pct"?: number | null,"window_applications"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_response_stats_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
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
                },"external_applications": {
                  Row: {
                    "candidate_id": string,"created_at": string,"job_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"job_id": string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"job_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "external_applications_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "candidates"
      referencedColumns: ["user_id"]
    },{
      foreignKeyName: "external_applications_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"external_apply_clicks": {
                  Row: {
                    "created_at": string,"id": number,"job_id": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"job_id": string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"job_id"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "external_apply_clicks_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"import_sources": {
                  Row: {
                    "active": boolean,"board_token": string,"company_id": string,"created_at": string,"created_by": string | null,"id": string,"last_attempt_at": string | null,"last_error": string | null,"last_result": Json | null,"last_synced_at": string | null,"provider": Database["public"]['Enums']["import_provider"]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"board_token": string,"company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_attempt_at"?: string | null,"last_error"?: string | null,"last_result"?: Json | null,"last_synced_at"?: string | null,"provider": Database["public"]['Enums']["import_provider"]
                  }
                  Update: {
                    "active"?: boolean,"board_token"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_attempt_at"?: string | null,"last_error"?: string | null,"last_result"?: Json | null,"last_synced_at"?: string | null,"provider"?: Database["public"]['Enums']["import_provider"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_sources_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
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
                },"job_reports": {
                  Row: {
                    "created_at": string,"details": string,"id": string,"job_id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string,"id"?: string,"job_id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"details"?: string,"id"?: string,"job_id"?: string,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "job_reports_job_id_fkey"
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
                    "city": string | null,"closed_at": string | null,"company_id": string,"country": string | null,"created_at": string,"created_by": string | null,"description": string,"employment_type": Database["public"]['Enums']["employment_type"],"external_id": string | null,"external_provider": Database["public"]['Enums']["import_provider"] | null,"external_url": string | null,"id": string,"import_source_id": string | null,"language": Database["public"]['Enums']["app_locale"],"published_at": string | null,"salary_basis": Database["public"]['Enums']["salary_basis"] | null,"salary_currency": Database["public"]['Enums']["currency"] | null,"salary_max": number | null,"salary_min": number | null,"salary_period": Database["public"]['Enums']["salary_period"] | null,"search_vector": unknown,"seniority": Database["public"]['Enums']["seniority"],"slug": string,"source": Database["public"]['Enums']["job_source"],"status": Database["public"]['Enums']["job_status"],"summary": string,"title": string,"updated_at": string,"valid_through": string,"work_mode": Database["public"]['Enums']["work_mode"],"is_job_public": boolean | null
                  }
                  ComputedFields: "is_job_public"
                  Insert: {
                    "city"?: string | null,"closed_at"?: string | null,"company_id": string,"country"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"employment_type": Database["public"]['Enums']["employment_type"],"external_id"?: string | null,"external_provider"?: Database["public"]['Enums']["import_provider"] | null,"external_url"?: string | null,"id"?: string,"import_source_id"?: string | null,"language": Database["public"]['Enums']["app_locale"],"published_at"?: string | null,"salary_basis"?: Database["public"]['Enums']["salary_basis"] | null,"salary_currency"?: Database["public"]['Enums']["currency"] | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_period"?: Database["public"]['Enums']["salary_period"] | null,"search_vector"?: unknown,"seniority": Database["public"]['Enums']["seniority"],"slug"?: string,"source"?: Database["public"]['Enums']["job_source"],"status"?: Database["public"]['Enums']["job_status"],"summary"?: string,"title": string,"updated_at"?: string,"valid_through": string,"work_mode": Database["public"]['Enums']["work_mode"]
                  }
                  Update: {
                    "city"?: string | null,"closed_at"?: string | null,"company_id"?: string,"country"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"employment_type"?: Database["public"]['Enums']["employment_type"],"external_id"?: string | null,"external_provider"?: Database["public"]['Enums']["import_provider"] | null,"external_url"?: string | null,"id"?: string,"import_source_id"?: string | null,"language"?: Database["public"]['Enums']["app_locale"],"published_at"?: string | null,"salary_basis"?: Database["public"]['Enums']["salary_basis"] | null,"salary_currency"?: Database["public"]['Enums']["currency"] | null,"salary_max"?: number | null,"salary_min"?: number | null,"salary_period"?: Database["public"]['Enums']["salary_period"] | null,"search_vector"?: unknown,"seniority"?: Database["public"]['Enums']["seniority"],"slug"?: string,"source"?: Database["public"]['Enums']["job_source"],"status"?: Database["public"]['Enums']["job_status"],"summary"?: string,"title"?: string,"updated_at"?: string,"valid_through"?: string,"work_mode"?: Database["public"]['Enums']["work_mode"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "jobs_import_source_id_fkey"
      columns: ["import_source_id"]
isOneToOne: false
      referencedRelation: "import_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "count": number,"created_at": string,"data": NonNullable<Json>,"group_key": string | null,"id": string,"kind": Database["public"]['Enums']["notification_kind"],"read_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"created_at"?: string,"data"?: NonNullable<Json>,"group_key"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["notification_kind"],"read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "count"?: number,"created_at"?: string,"data"?: NonNullable<Json>,"group_key"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["notification_kind"],"read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"people": {
                  Row: {
                    "avatar_path": string | null,"created_at": string,"first_name": string,"full_name": string | null,"last_name": string,"middle_name": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_path"?: string | null,"created_at"?: string,"first_name": string,"full_name"?: never,"last_name"?: string,"middle_name"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "avatar_path"?: string | null,"created_at"?: string,"first_name"?: string,"full_name"?: never,"last_name"?: string,"middle_name"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"post_likes": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_reports": {
                  Row: {
                    "created_at": string,"post_id": string,"reason": Database["public"]['Enums']["post_report_reason"],"reporter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"reason": Database["public"]['Enums']["post_report_reason"],"reporter_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"reason"?: Database["public"]['Enums']["post_report_reason"],"reporter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_reports_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"excerpt": string | null,"id": string,"language": Database["public"]['Enums']["app_locale"],"likes_count": number,"slug": string,"status": Database["public"]['Enums']["post_status"],"tags": (string)[],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"excerpt"?: never,"id"?: string,"language"?: Database["public"]['Enums']["app_locale"],"likes_count"?: number,"slug": string,"status"?: Database["public"]['Enums']["post_status"],"tags"?: (string)[],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"excerpt"?: never,"id"?: string,"language"?: Database["public"]['Enums']["app_locale"],"likes_count"?: number,"slug"?: string,"status"?: Database["public"]['Enums']["post_status"],"tags"?: (string)[],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["user_id"]
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
                },"saved_companies": {
                  Row: {
                    "company_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_companies_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_companies_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_jobs": {
                  Row: {
                    "created_at": string,"job_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"job_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"job_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_jobs_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_jobs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_posts": {
                  Row: {
                    "created_at": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_posts_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_posts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
"admin_add_import_source":
{ Args: { "p_board_token": string,"p_company_name": string,"p_provider": Database["public"]['Enums']["import_provider"],"p_website_url": string }; Returns: string
                           },
"admin_find_users":
{ Args: { "p_query": string }; Returns: {
              "company_name": string,"email": string,"id": string,"role": Database["public"]['Enums']["user_role"],"suspended_at": string
            }[]
                           },
"admin_import_sources":
{ Args: Record<PropertyKey, never>; Returns: {
              "active": boolean,"board_token": string,"company_name": string,"company_slug": string,"id": string,"last_attempt_at": string,"last_error": string,"last_result": Json,"last_synced_at": string,"open_jobs": number,"provider": Database["public"]['Enums']["import_provider"]
            }[]
                           },
"admin_open_reports":
{ Args: Record<PropertyKey, never>; Returns: {
              "company_name": string,"details": (string)[],"first_report_id": string,"job_id": string,"job_slug": string,"job_status": Database["public"]['Enums']["job_status"],"job_title": string,"last_reported_at": string,"reasons": (Database["public"]['Enums']["report_reason"])[],"reports": number
            }[]
                           },
"admin_restore_post":
{ Args: { "p_post_id": string }; Returns: undefined
                           },
"admin_review_report":
{ Args: { "p_action": string,"p_report_id": string }; Returns: undefined
                           },
"admin_set_company_status":
{ Args: { "p_company_id": string,"p_status": Database["public"]['Enums']["company_status"] }; Returns: undefined
                           },
"admin_set_import_source_active":
{ Args: { "p_active": boolean,"p_source_id": string }; Returns: undefined
                           },
"admin_set_user_suspended":
{ Args: { "p_suspended": boolean,"p_user_id": string }; Returns: undefined
                           },
"admin_transfer_company":
{ Args: { "p_company_id": string,"p_email": string }; Returns: undefined
                           },
"admin_unclaimed_companies":
{ Args: Record<PropertyKey, never>; Returns: {
              "clicks": number,"domain": string,"id": string,"jobs": number,"name": string,"slug": string
            }[]
                           },
"admin_upsert_unclaimed_company":
{ Args: { "p_name": string,"p_website_url": string }; Returns: string
                           },
"apply_to_job":
{ Args: { "p_answers"?: Json,"p_job_id": string }; Returns: string
                           },
"auth_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"auth_throttle_fail":
{ Args: { "p_key": string,"p_lock": string,"p_max": number,"p_window": string }; Returns: undefined
                           },
"auth_throttle_reset":
{ Args: { "p_key": string }; Returns: undefined
                           },
"auth_throttle_wait":
{ Args: { "p_keys": (string)[] }; Returns: number
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
"candidate_suggestions":
{ Args: { "p_candidate_id": string }; Returns: (string)[]
                           },
"change_application_status":
{ Args: { "p_application_id": string,"p_message"?: string,"p_to": Database["public"]['Enums']["application_status"] }; Returns: undefined
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
"clean_post_tags":
{ Args: { "p_tags": (string)[] }; Returns: (string)[]
                           },
"company_cards":
{ Args: { "p_company_id"?: string,"p_limit"?: number,"p_offset"?: number,"p_query"?: string,"p_saved_only"?: boolean }; Returns: {
              "city": string,"country": string,"cover_path": string,"id": string,"industry": string,"liked": boolean,"likes_count": number,"logo_path": string,"name": string,"open_jobs": number,"saved": boolean,"slug": string,"total_count": number,"verified": boolean
            }[]
                           },
"company_job_cards":
{ Args: { "p_company_id": string }; Returns: {
              "city": string,"company_badge": Database["public"]['Enums']["response_badge"],"company_logo_path": string,"company_name": string,"company_slug": string,"company_verified": boolean,"country": string,"employment_type": Database["public"]['Enums']["employment_type"],"external_apply": boolean,"id": string,"language": Database["public"]['Enums']["app_locale"],"published_at": string,"salary_basis": Database["public"]['Enums']["salary_basis"],"salary_currency": Database["public"]['Enums']["currency"],"salary_max": number,"salary_min": number,"salary_period": Database["public"]['Enums']["salary_period"],"seniority": Database["public"]['Enums']["seniority"],"skills": Json,"slug": string,"source": Database["public"]['Enums']["job_source"],"title": string,"total_count": number,"work_mode": Database["public"]['Enums']["work_mode"]
            }[]
                           },
"complete_candidate_setup":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"complete_company_setup":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"create_company":
{ Args: { "p_company_name": string,"p_locale": Database["public"]['Enums']["app_locale"],"p_website_url": string }; Returns: string
                           },
"create_invitation":
{ Args: { "p_email": string,"p_token_hash": string }; Returns: string
                           },
"create_post":
{ Args: { "p_body": string,"p_language": Database["public"]['Enums']["app_locale"],"p_tags"?: (string)[],"p_title": string }; Returns: string
                           },
"daily_maintenance":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"delete_post":
{ Args: { "p_post_id": string }; Returns: undefined
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
"export_my_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"has_applied_to_my_company":
{ Args: { "p_candidate_id": string }; Returns: boolean
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
"is_suspended":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"like_needle":
{ Args: { "p_query": string }; Returns: string
                           },
"list_company_members":
{ Args: Record<PropertyKey, never>; Returns: {
              "email": string,"joined_at": string,"member_role": Database["public"]['Enums']["member_role"],"user_id": string
            }[]
                           },
"my_company_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"my_job_application_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "job_id": string,"status": Database["public"]['Enums']["application_status"],"total": number
            }[]
                           },
"normalize_post_tag":
{ Args: { "p_tag": string }; Returns: string
                           },
"notify":
{ Args: { "p_data": Json,"p_group_key"?: string,"p_kind": Database["public"]['Enums']["notification_kind"],"p_user_id": string }; Returns: undefined
                           },
"notify_job_matches":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"onboard_candidate":
{ Args: { "p_first_name": string,"p_headline": string,"p_last_name": string,"p_locale": Database["public"]['Enums']["app_locale"],"p_middle_name": string }; Returns: undefined
                           },
"onboard_recruiter":
{ Args: { "p_company_name": string,"p_first_name": string,"p_last_name": string,"p_locale": Database["public"]['Enums']["app_locale"],"p_middle_name": string,"p_website_url": string }; Returns: string
                           },
"post_cards":
{ Args: { "p_author_id"?: string,"p_company_id"?: string,"p_limit"?: number,"p_offset"?: number,"p_post_id"?: string,"p_query"?: string,"p_saved_only"?: boolean,"p_tag"?: string }; Returns: {
              "author_avatar": string,"author_company_name": string,"author_company_slug": string,"author_name": string,"author_profile_slug": string,"author_role": Database["public"]['Enums']["user_role"],"created_at": string,"excerpt": string,"id": string,"language": Database["public"]['Enums']["app_locale"],"liked": boolean,"likes_count": number,"saved": boolean,"slug": string,"tags": (string)[],"title": string,"total_count": number
            }[]
                           },
"prefix_tsquery":
{ Args: { "p_query": string }; Returns: unknown
                           },
"random_slug":
{ Args: { "p_value": string }; Returns: string
                           },
"record_external_application":
{ Args: { "p_job_id": string }; Returns: undefined
                           },
"record_external_click":
{ Args: { "p_job_id": string }; Returns: string
                           },
"record_import_error":
{ Args: { "p_error": string,"p_source_id": string }; Returns: undefined
                           },
"refresh_company_response_stats":
{ Args: { "p_company_id": string }; Returns: undefined
                           },
"refresh_job_search_vector":
{ Args: { "p_job_id": string }; Returns: undefined
                           },
"register_profile_view":
{ Args: { "p_slug": string }; Returns: string
                           },
"report_post":
{ Args: { "p_post_id": string,"p_reason": Database["public"]['Enums']["post_report_reason"] }; Returns: undefined
                           },
"save_my_name":
{ Args: { "p_first_name": string,"p_last_name": string,"p_middle_name": string }; Returns: undefined
                           },
"saved_job_cards":
{ Args: Record<PropertyKey, never>; Returns: {
              "city": string,"company_badge": Database["public"]['Enums']["response_badge"],"company_logo_path": string,"company_name": string,"company_slug": string,"company_verified": boolean,"country": string,"employment_type": Database["public"]['Enums']["employment_type"],"external_apply": boolean,"id": string,"language": Database["public"]['Enums']["app_locale"],"published_at": string,"salary_basis": Database["public"]['Enums']["salary_basis"],"salary_currency": Database["public"]['Enums']["currency"],"salary_max": number,"salary_min": number,"salary_period": Database["public"]['Enums']["salary_period"],"seniority": Database["public"]['Enums']["seniority"],"skills": Json,"slug": string,"source": Database["public"]['Enums']["job_source"],"title": string,"total_count": number,"work_mode": Database["public"]['Enums']["work_mode"]
            }[]
                           },
"search_jobs":
{ Args: { "p_country"?: string,"p_currency"?: Database["public"]['Enums']["currency"],"p_employment_types"?: (Database["public"]['Enums']["employment_type"])[],"p_language"?: Database["public"]['Enums']["app_locale"],"p_limit"?: number,"p_offset"?: number,"p_query"?: string,"p_salary_visible"?: boolean,"p_seniorities"?: (Database["public"]['Enums']["seniority"])[],"p_work_modes"?: (Database["public"]['Enums']["work_mode"])[] }; Returns: {
              "city": string,"company_badge": Database["public"]['Enums']["response_badge"],"company_logo_path": string,"company_name": string,"company_slug": string,"company_verified": boolean,"country": string,"employment_type": Database["public"]['Enums']["employment_type"],"external_apply": boolean,"id": string,"language": Database["public"]['Enums']["app_locale"],"published_at": string,"salary_basis": Database["public"]['Enums']["salary_basis"],"salary_currency": Database["public"]['Enums']["currency"],"salary_max": number,"salary_min": number,"salary_period": Database["public"]['Enums']["salary_period"],"seniority": Database["public"]['Enums']["seniority"],"skills": Json,"slug": string,"source": Database["public"]['Enums']["job_source"],"title": string,"total_count": number,"work_mode": Database["public"]['Enums']["work_mode"]
            }[]
                           },
"set_company_cover":
{ Args: { "p_path": string }; Returns: undefined
                           },
"set_company_logo":
{ Args: { "p_path": string }; Returns: undefined
                           },
"set_my_avatar":
{ Args: { "p_path": string }; Returns: undefined
                           },
"slugify":
{ Args: { "p_value": string }; Returns: string
                           },
"sync_import_source":
{ Args: { "p_jobs": Json,"p_skipped"?: number,"p_source_id": string }; Returns: Json
                           },
"talent_cards":
{ Args: { "p_availability"?: Database["public"]['Enums']["availability"],"p_country"?: string,"p_limit"?: number,"p_offset"?: number,"p_query"?: string,"p_skill"?: string }; Returns: {
              "availability": Database["public"]['Enums']["availability"],"avatar_path": string,"city": string,"country": string,"full_name": string,"headline": string,"skills": Json,"slug": string,"total_count": number,"user_id": string
            }[]
                           },
"toggle_company_like":
{ Args: { "p_company_id": string }; Returns: boolean
                           },
"toggle_post_like":
{ Args: { "p_post_id": string }; Returns: boolean
                           },
"toggle_saved_company":
{ Args: { "p_company_id": string }; Returns: boolean
                           },
"toggle_saved_job":
{ Args: { "p_job_id": string }; Returns: boolean
                           },
"toggle_saved_post":
{ Args: { "p_post_id": string }; Returns: boolean
                           },
"unread_notifications_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"update_company_website":
{ Args: { "p_website_url": string }; Returns: undefined
                           },
"update_member":
{ Args: { "p_action": string,"p_user_id": string }; Returns: undefined
                           },
"update_post":
{ Args: { "p_body": string,"p_language": Database["public"]['Enums']["app_locale"],"p_post_id": string,"p_tags"?: (string)[],"p_title": string }; Returns: undefined
                           },
"valid_post_tags":
{ Args: { "p_tags": (string)[] }; Returns: boolean
                           },
"visible_candidate_id":
{ Args: { "p_slug": string }; Returns: string
                           },
"withdraw_application":
{ Args: { "p_application_id": string }; Returns: undefined
                           },
"write_audit_log":
{ Args: { "p_action": string,"p_metadata"?: Json,"p_target_id"?: string,"p_target_type"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "actor_type": "candidate"|"recruiter"|"system","app_locale": "es"|"en","application_status": "received"|"in_review"|"interview"|"hired"|"rejected"|"no_response"|"withdrawn","availability": "immediate"|"two_weeks"|"freelance_only"|"not_looking","company_size": "1-10"|"11-50"|"51-200"|"201-1000"|"1000+","company_stage": "pre_seed"|"seed"|"series_a_plus"|"bootstrapped"|"established","company_status": "unclaimed"|"active"|"suspended","currency": "USD"|"ARS"|"EUR"|"BRL"|"MXN"|"CLP"|"COP"|"UYU","email_status": "pending"|"sent"|"failed","employment_type": "full_time"|"part_time"|"contract"|"internship"|"freelance","import_provider": "manual"|"greenhouse"|"lever"|"ashby"|"workable","job_source": "native"|"imported","job_status": "draft"|"published"|"closed"|"hidden","member_role": "owner"|"member","notification_kind": "application_status"|"new_applicant"|"post_liked"|"company_liked"|"job_matches"|"member_joined"|"role_changed","post_report_reason": "spam"|"offensive"|"scam"|"other","post_status": "published"|"hidden","profile_visibility": "companies_only"|"public"|"hidden","question_type": "short_text"|"single_choice","report_reason": "scam"|"fake"|"discrimination"|"other","report_status": "open"|"dismissed"|"actioned","response_badge": "new"|"fast"|"medium"|"slow","salary_basis": "gross"|"net","salary_period": "hour"|"month"|"year","salary_visibility": "private"|"applied_companies","seniority": "trainee"|"junior"|"semi_senior"|"senior"|"lead","skill_category": "language"|"framework"|"tool"|"data"|"design"|"marketing"|"soft","skill_level": "basic"|"intermediate"|"advanced"|"expert","user_role": "candidate"|"recruiter"|"admin","work_mode": "remote"|"hybrid"|"onsite"
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
            "actor_type": ["candidate", "recruiter", "system"],"app_locale": ["es", "en"],"application_status": ["received", "in_review", "interview", "hired", "rejected", "no_response", "withdrawn"],"availability": ["immediate", "two_weeks", "freelance_only", "not_looking"],"company_size": ["1-10", "11-50", "51-200", "201-1000", "1000+"],"company_stage": ["pre_seed", "seed", "series_a_plus", "bootstrapped", "established"],"company_status": ["unclaimed", "active", "suspended"],"currency": ["USD", "ARS", "EUR", "BRL", "MXN", "CLP", "COP", "UYU"],"email_status": ["pending", "sent", "failed"],"employment_type": ["full_time", "part_time", "contract", "internship", "freelance"],"import_provider": ["manual", "greenhouse", "lever", "ashby", "workable"],"job_source": ["native", "imported"],"job_status": ["draft", "published", "closed", "hidden"],"member_role": ["owner", "member"],"notification_kind": ["application_status", "new_applicant", "post_liked", "company_liked", "job_matches", "member_joined", "role_changed"],"post_report_reason": ["spam", "offensive", "scam", "other"],"post_status": ["published", "hidden"],"profile_visibility": ["companies_only", "public", "hidden"],"question_type": ["short_text", "single_choice"],"report_reason": ["scam", "fake", "discrimination", "other"],"report_status": ["open", "dismissed", "actioned"],"response_badge": ["new", "fast", "medium", "slow"],"salary_basis": ["gross", "net"],"salary_period": ["hour", "month", "year"],"salary_visibility": ["private", "applied_companies"],"seniority": ["trainee", "junior", "semi_senior", "senior", "lead"],"skill_category": ["language", "framework", "tool", "data", "design", "marketing", "soft"],"skill_level": ["basic", "intermediate", "advanced", "expert"],"user_role": ["candidate", "recruiter", "admin"],"work_mode": ["remote", "hybrid", "onsite"]
          }
        }
} as const
