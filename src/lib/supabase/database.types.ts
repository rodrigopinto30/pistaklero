
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
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
            "auth_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"can_view_candidate":
{ Args: { "p_candidate_id": string }; Returns: boolean
                           },
"create_company":
{ Args: { "p_company_name": string,"p_locale": Database["public"]['Enums']["app_locale"],"p_website_url": string }; Returns: string
                           },
"domain_from_url":
{ Args: { "p_url": string }; Returns: string
                           },
"email_matches_domain":
{ Args: { "p_domain": string,"p_email": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_free_email_domain":
{ Args: { "p_domain": string }; Returns: boolean
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
"slugify":
{ Args: { "p_value": string }; Returns: string
                           },
"write_audit_log":
{ Args: { "p_action": string,"p_metadata"?: Json,"p_target_id"?: string,"p_target_type"?: string }; Returns: undefined
                           }
          }
          Enums: {
            "app_locale": "es"|"en","availability": "immediate"|"two_weeks"|"freelance_only"|"not_looking","company_size": "1-10"|"11-50"|"51-200"|"201-1000"|"1000+","company_stage": "pre_seed"|"seed"|"series_a_plus"|"bootstrapped"|"established","company_status": "unclaimed"|"active"|"suspended","currency": "USD"|"ARS"|"EUR"|"BRL"|"MXN"|"CLP"|"COP"|"UYU","member_role": "owner"|"member","profile_visibility": "companies_only"|"public"|"hidden","salary_basis": "gross"|"net","salary_period": "hour"|"month"|"year","salary_visibility": "private"|"applied_companies","skill_category": "language"|"framework"|"tool"|"data"|"design"|"marketing"|"soft","skill_level": "basic"|"intermediate"|"advanced"|"expert","user_role": "candidate"|"recruiter"|"admin"
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
            "app_locale": ["es", "en"],"availability": ["immediate", "two_weeks", "freelance_only", "not_looking"],"company_size": ["1-10", "11-50", "51-200", "201-1000", "1000+"],"company_stage": ["pre_seed", "seed", "series_a_plus", "bootstrapped", "established"],"company_status": ["unclaimed", "active", "suspended"],"currency": ["USD", "ARS", "EUR", "BRL", "MXN", "CLP", "COP", "UYU"],"member_role": ["owner", "member"],"profile_visibility": ["companies_only", "public", "hidden"],"salary_basis": ["gross", "net"],"salary_period": ["hour", "month", "year"],"salary_visibility": ["private", "applied_companies"],"skill_category": ["language", "framework", "tool", "data", "design", "marketing", "soft"],"skill_level": ["basic", "intermediate", "advanced", "expert"],"user_role": ["candidate", "recruiter", "admin"]
          }
        }
} as const
