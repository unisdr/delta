-- This file must contain dts database for fresh installation for the current version of the system

--
-- PostgreSQL database dump
--

-- Dumped from database version 16.6
-- Dumped by pg_dump version 16.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: dts_get_sector_ancestors_decentants(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.dts_get_sector_ancestors_decentants(sector_id bigint) RETURNS json
    LANGUAGE sql
    AS $$
WITH RECURSIVE ParentCTE AS (
    -- Find all ancestors (parents)
    SELECT id, sectorname, parent_id, level
    FROM sector
    WHERE id = SECTOR_ID
    UNION ALL
    SELECT t.id, t.sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ParentCTE p ON t.id = p.parent_id
),
ChildCTE AS (
    -- Find all descendants (children)
    SELECT id, sectorname, parent_id, level
    FROM sector
    WHERE id = SECTOR_ID
    UNION ALL
    SELECT t.id, t.sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ChildCTE c ON t.parent_id = c.id
)
SELECT json_agg(row_to_json(all_records))
FROM (
    SELECT id, sectorname, level FROM ParentCTE WHERE level = 2
    UNION
    SELECT id, sectorname, level FROM ChildCTE
) all_records;
$$;


ALTER FUNCTION public.dts_get_sector_ancestors_decentants(sector_id bigint) OWNER TO postgres;

--
-- Name: dts_get_sector_decendants(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.dts_get_sector_decendants(sector_id bigint) RETURNS json
    LANGUAGE sql
    AS $$
WITH RECURSIVE ChildCTE AS (
    -- Find all descendants (children)
    SELECT id, sectorname, parent_id, level
    FROM sector
    WHERE id = SECTOR_ID
    UNION ALL
    SELECT t.id, t.sectorname, t.parent_id, t.level
    FROM sector t
    INNER JOIN ChildCTE c ON t.parent_id = c.id
)
SELECT json_agg(row_to_json(all_records))
FROM (
    SELECT id, sectorname, level FROM ChildCTE
) all_records;
$$;


ALTER FUNCTION public.dts_get_sector_decendants(sector_id bigint) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations__; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.__drizzle_migrations__ (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE public.__drizzle_migrations__ OWNER TO postgres;

--
-- Name: __drizzle_migrations___id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.__drizzle_migrations___id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.__drizzle_migrations___id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations___id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.__drizzle_migrations___id_seq OWNED BY public.__drizzle_migrations__.id;


--
-- Name: affected; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.affected (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    direct integer,
    indirect integer
);


ALTER TABLE public.affected OWNER TO postgres;

--
-- Name: api_key; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_key (
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id bigint NOT NULL,
    secret text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    user_id bigint NOT NULL
);


ALTER TABLE public.api_key OWNER TO postgres;

--
-- Name: api_key_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.api_key_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_key_id_seq OWNER TO postgres;

--
-- Name: api_key_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.api_key_id_seq OWNED BY public.api_key.id;


--
-- Name: asset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_ids text NOT NULL,
    is_built_in boolean NOT NULL,
    name text NOT NULL,
    category text,
    national_id text,
    notes text
);


ALTER TABLE public.asset OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    record_id text NOT NULL,
    user_id bigint NOT NULL,
    action text NOT NULL,
    old_values jsonb,
    new_values jsonb,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name text NOT NULL,
    parent_id bigint,
    level bigint DEFAULT 1 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: commonPasswords; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."commonPasswords" (
    password text NOT NULL
);


ALTER TABLE public."commonPasswords" OWNER TO postgres;

--
-- Name: country1; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.country1 (
    id bigint NOT NULL,
    name jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.country1 OWNER TO postgres;

--
-- Name: country1_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.country1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.country1_id_seq OWNER TO postgres;

--
-- Name: country1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.country1_id_seq OWNED BY public.country1.id;


--
-- Name: damages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.damages (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    sector_id bigint NOT NULL,
    asset_id uuid NOT NULL,
    unit text,
    total_damage_amount bigint,
    total_damage_amount_override boolean DEFAULT false NOT NULL,
    total_repair_replacement numeric,
    total_repair_replacement_override boolean DEFAULT false NOT NULL,
    total_recovery numeric,
    total_recovery_override boolean DEFAULT false NOT NULL,
    pd_damage_amount bigint,
    pd_repair_cost_unit numeric,
    pd_repair_cost_unit_currency text,
    pd_repair_cost_total numeric,
    pd_repair_cost_total_override boolean DEFAULT false NOT NULL,
    pd_recovery_cost_unit numeric,
    pd_recovery_cost_unit_currency text,
    pd_recovery_cost_total numeric,
    pd_recovery_cost_total_override boolean DEFAULT false NOT NULL,
    pd_disruption_duration_days bigint,
    pd_disruption_duration_hours bigint,
    pd_disruption_users_affected bigint,
    pd_disruption_people_affected bigint,
    pd_disruption_description text,
    td_damage_amount bigint,
    td_replacement_cost_unit numeric,
    td_replacement_cost_unit_currency text,
    td_replacement_cost_total numeric,
    td_replacement_cost_total_override boolean DEFAULT false NOT NULL,
    td_recovery_cost_unit numeric,
    td_recovery_cost_unit_currency text,
    td_recovery_cost_total numeric,
    td_recovery_cost_total_override boolean DEFAULT false NOT NULL,
    td_disruption_duration_days bigint,
    td_disruption_duration_hours bigint,
    td_disruption_users_affected bigint,
    td_disruption_people_affected bigint,
    td_disruption_description text,
    spatial_footprint jsonb,
    attachments jsonb
);


ALTER TABLE public.damages OWNER TO postgres;

--
-- Name: deaths; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deaths (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    deaths integer
);


ALTER TABLE public.deaths OWNER TO postgres;

--
-- Name: dev_example1; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dev_example1 (
    api_import_id text,
    id bigint NOT NULL,
    field1 text NOT NULL,
    field2 text NOT NULL,
    field3 bigint NOT NULL,
    field4 bigint,
    field6 text DEFAULT 'one'::text NOT NULL,
    repeatable_num1 integer,
    repeatable_text1 text,
    repeatable_num2 integer,
    repeatable_text2 text,
    repeatable_num3 integer,
    repeatable_text3 text,
    field7 timestamp without time zone,
    field8 text DEFAULT ''::text NOT NULL,
    json_data jsonb
);


ALTER TABLE public.dev_example1 OWNER TO postgres;

--
-- Name: TABLE dev_example1; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.dev_example1 IS 'This is comment';


--
-- Name: dev_example1_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dev_example1_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dev_example1_id_seq OWNER TO postgres;

--
-- Name: dev_example1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dev_example1_id_seq OWNED BY public.dev_example1.id;


--
-- Name: disaster_event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disaster_event (
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'draft'::text NOT NULL,
    api_import_id text,
    hip_hazard_id text,
    hip_cluster_id text,
    id uuid NOT NULL,
    hazardous_event_id uuid,
    national_disaster_id text DEFAULT ''::text NOT NULL,
    other_id1 text DEFAULT ''::text NOT NULL,
    other_id2 text DEFAULT ''::text NOT NULL,
    other_id3 text DEFAULT ''::text NOT NULL,
    name_national text DEFAULT ''::text NOT NULL,
    glide text DEFAULT ''::text NOT NULL,
    name_global_or_regional text DEFAULT ''::text NOT NULL,
    start_date text DEFAULT ''::text NOT NULL,
    end_date text DEFAULT ''::text NOT NULL,
    start_date_local text,
    end_date_local text,
    duration_days bigint,
    disaster_declaration text DEFAULT 'unknown'::text NOT NULL,
    had_official_warning_or_weather_advisory boolean DEFAULT false NOT NULL,
    official_warning_affected_areas text DEFAULT ''::text NOT NULL,
    response_oprations text DEFAULT ''::text NOT NULL,
    data_source text DEFAULT ''::text NOT NULL,
    recording_institution text DEFAULT ''::text NOT NULL,
    effects_total_usd numeric,
    non_economic_losses text DEFAULT ''::text NOT NULL,
    damages_subtotal_local_currency numeric,
    losses_subtotal_usd numeric,
    response_operations_description text DEFAULT ''::text NOT NULL,
    response_operations_costs_local_currency numeric,
    response_cost_total_local_currency numeric,
    response_cost_total_usd numeric,
    humanitarian_needs_description text DEFAULT ''::text NOT NULL,
    humanitarian_needs_local_currency numeric,
    humanitarian_needs_usd numeric,
    attachments jsonb,
    spatial_footprint jsonb,
    disaster_event_id uuid,
    hip_type_id text,
    early_action_date1 timestamp without time zone,
    early_action_date2 timestamp without time zone,
    early_action_date3 timestamp without time zone,
    early_action_date4 timestamp without time zone,
    early_action_date5 timestamp without time zone,
    disaster_declaration_type_and_effect1 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date1 timestamp without time zone,
    disaster_declaration_type_and_effect2 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date2 timestamp without time zone,
    disaster_declaration_type_and_effect3 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date3 timestamp without time zone,
    disaster_declaration_type_and_effect4 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date4 timestamp without time zone,
    disaster_declaration_type_and_effect5 text DEFAULT ''::text NOT NULL,
    disaster_declaration_date5 timestamp without time zone,
    early_action_description1 text DEFAULT ''::text NOT NULL,
    early_action_description2 text DEFAULT ''::text NOT NULL,
    early_action_description3 text DEFAULT ''::text NOT NULL,
    early_action_description4 text DEFAULT ''::text NOT NULL,
    early_action_description5 text DEFAULT ''::text NOT NULL,
    rapid_or_preliminary_assesment_description1 text,
    rapid_or_preliminary_assessment_date1 timestamp without time zone,
    rapid_or_preliminary_assesment_description2 text,
    rapid_or_preliminary_assessment_date2 timestamp without time zone,
    rapid_or_preliminary_assesment_description3 text,
    rapid_or_preliminary_assessment_date3 timestamp without time zone,
    rapid_or_preliminary_assesment_description4 text,
    rapid_or_preliminary_assessment_date4 timestamp without time zone,
    rapid_or_preliminary_assesment_description5 text,
    rapid_or_preliminary_assessment_date5 timestamp without time zone,
    post_disaster_assessment_description1 text,
    post_disaster_assessment_date1 timestamp without time zone,
    post_disaster_assessment_description2 text,
    post_disaster_assessment_date2 timestamp without time zone,
    post_disaster_assessment_description3 text,
    post_disaster_assessment_date3 timestamp without time zone,
    post_disaster_assessment_description4 text,
    post_disaster_assessment_date4 timestamp without time zone,
    post_disaster_assessment_description5 text,
    post_disaster_assessment_date5 timestamp without time zone,
    other_assessment_description1 text,
    other_assessment_date1 timestamp without time zone,
    other_assessment_description2 text,
    other_assessment_date2 timestamp without time zone,
    other_assessment_description3 text,
    other_assessment_date3 timestamp without time zone,
    other_assessment_description4 text,
    other_assessment_date4 timestamp without time zone,
    other_assessment_description5 text,
    other_assessment_date5 timestamp without time zone,
    rehabilitation_costs_local_currency_calc numeric,
    rehabilitation_costs_local_currency_override numeric,
    repair_costs_local_currency_calc numeric,
    repair_costs_local_currency_override numeric,
    replacement_costs_local_currency_calc numeric,
    replacement_costs_local_currency_override numeric,
    recovery_needs_local_currency_calc numeric,
    recovery_needs_local_currency_override numeric,
    legacy_data jsonb
);


ALTER TABLE public.disaster_event OWNER TO postgres;

--
-- Name: disaster_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disaster_records (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    disaster_event_id uuid,
    location_desc text,
    start_date text,
    end_date text,
    local_warn_inst text,
    primary_data_source text,
    other_data_source text,
    field_assess_date timestamp without time zone,
    assessment_modes text,
    originator_recorder_inst text DEFAULT ''::text NOT NULL,
    validated_by text DEFAULT ''::text NOT NULL,
    checked_by text,
    data_collector text,
    spatial_footprint jsonb,
    "approvalStatus" text DEFAULT 'draft'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    hip_hazard_id text,
    hip_cluster_id text,
    hip_type_id text,
    attachments jsonb,
    legacy_data jsonb
);


ALTER TABLE public.disaster_records OWNER TO postgres;

--
-- Name: displaced; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.displaced (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    assisted text,
    timing text,
    duration text,
    as_of timestamp without time zone,
    displaced integer
);


ALTER TABLE public.displaced OWNER TO postgres;

--
-- Name: disruption; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disruption (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    sector_id bigint NOT NULL,
    duration_days bigint,
    duration_hours bigint,
    users_affected bigint,
    people_affected bigint,
    comment text,
    response_operation text,
    response_cost numeric,
    response_currency text,
    spatial_footprint jsonb,
    attachments jsonb
);


ALTER TABLE public.disruption OWNER TO postgres;

--
-- Name: division; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.division (
    id bigint NOT NULL,
    import_id text,
    parent_id bigint,
    name jsonb DEFAULT '{}'::jsonb NOT NULL,
    geojson jsonb,
    level bigint,
    national_id text,
    geom public.geometry(Geometry,4326) GENERATED ALWAYS AS (public.st_setsrid(public.st_makevalid(public.st_geomfromgeojson((geojson)::text)), 4326)) STORED,
    bbox public.geometry(Geometry,4326) GENERATED ALWAYS AS (public.st_setsrid(public.st_envelope(public.st_setsrid(public.st_makevalid(public.st_geomfromgeojson((geojson)::text)), 4326)), 4326)) STORED,
    spatial_index text GENERATED ALWAYS AS (
CASE
    WHEN (parent_id IS NULL) THEN ('L1-'::text || (id)::text)
    ELSE ((((('L'::text || (level)::text) || '-'::text) || (parent_id)::text) || '-'::text) || (id)::text)
END) STORED,
    CONSTRAINT valid_geom_check CHECK (public.st_isvalid(geom))
);


ALTER TABLE public.division OWNER TO postgres;

--
-- Name: division_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.division_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.division_id_seq OWNER TO postgres;

--
-- Name: division_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.division_id_seq OWNED BY public.division.id;


--
-- Name: event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.event OWNER TO postgres;

--
-- Name: event_relationship; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_relationship (
    parent_id uuid NOT NULL,
    child_id uuid NOT NULL,
    type text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.event_relationship OWNER TO postgres;

--
-- Name: hazardous_event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hazardous_event (
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvalStatus" text DEFAULT 'draft'::text NOT NULL,
    api_import_id text,
    hip_hazard_id text,
    hip_cluster_id text,
    id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    national_specification text DEFAULT ''::text NOT NULL,
    start_date text DEFAULT ''::text NOT NULL,
    end_date text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    chains_explanation text DEFAULT ''::text NOT NULL,
    magniture text DEFAULT ''::text NOT NULL,
    spatial_footprint jsonb,
    record_originator text DEFAULT ''::text NOT NULL,
    hazardous_event_status text,
    data_source text DEFAULT ''::text NOT NULL,
    hip_type_id text NOT NULL,
    attachments jsonb
);


ALTER TABLE public.hazardous_event OWNER TO postgres;

--
-- Name: hip_class; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hip_class (
    id text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    CONSTRAINT name_en_not_empty CHECK ((name_en <> ''::text))
);


ALTER TABLE public.hip_class OWNER TO postgres;

--
-- Name: hip_cluster; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hip_cluster (
    id text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    type_id text NOT NULL,
    CONSTRAINT name_en_not_empty CHECK ((name_en <> ''::text))
);


ALTER TABLE public.hip_cluster OWNER TO postgres;

--
-- Name: hip_hazard; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hip_hazard (
    id text NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    cluster_id text NOT NULL,
    name_en text DEFAULT ''::text NOT NULL,
    description_en text DEFAULT ''::text NOT NULL,
    CONSTRAINT description_en_not_empty CHECK ((description_en <> ''::text)),
    CONSTRAINT name_en_not_empty CHECK ((name_en <> ''::text))
);


ALTER TABLE public.hip_hazard OWNER TO postgres;

--
-- Name: human_category_presence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.human_category_presence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    deaths boolean,
    injured boolean,
    missing boolean,
    affected_direct boolean,
    affected_indirect boolean,
    displaced boolean
);


ALTER TABLE public.human_category_presence OWNER TO postgres;

--
-- Name: human_dsg; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.human_dsg (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    sex text,
    age text,
    disability text,
    global_poverty_line text,
    national_poverty_line text,
    custom jsonb
);


ALTER TABLE public.human_dsg OWNER TO postgres;

--
-- Name: human_dsg_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.human_dsg_config (
    hidden jsonb,
    custom jsonb
);


ALTER TABLE public.human_dsg_config OWNER TO postgres;

--
-- Name: injured; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.injured (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    injured integer
);


ALTER TABLE public.injured OWNER TO postgres;

--
-- Name: losses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.losses (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    record_id uuid NOT NULL,
    sector_id bigint NOT NULL,
    sector_is_agriculture boolean NOT NULL,
    related_to_not_agriculture text,
    related_to_agriculture text,
    description text,
    public_value_unit text,
    public_units bigint,
    public_cost_unit numeric,
    public_cost_unit_currency text,
    public_cost_total numeric,
    public_cost_total_override boolean DEFAULT false NOT NULL,
    private_value_unit text,
    private_units bigint,
    private_cost_unit numeric,
    private_cost_unit_currency text,
    private_cost_total numeric,
    private_cost_total_override boolean DEFAULT false NOT NULL,
    spatial_footprint jsonb,
    attachments jsonb,
    type_not_agriculture text,
    type_agriculture text
);


ALTER TABLE public.losses OWNER TO postgres;

--
-- Name: measure; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.measure (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'area'::text NOT NULL
);


ALTER TABLE public.measure OWNER TO postgres;

--
-- Name: missing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.missing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dsg_id uuid NOT NULL,
    as_of timestamp without time zone,
    missing integer
);


ALTER TABLE public.missing OWNER TO postgres;

--
-- Name: noneco_losses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.noneco_losses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    disaster_record_id uuid NOT NULL,
    category_id bigint NOT NULL,
    description text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    api_import_id text
);


ALTER TABLE public.noneco_losses OWNER TO postgres;

--
-- Name: resource_repo; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resource_repo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    attachments jsonb,
    "approvalStatus" text DEFAULT 'draft'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.resource_repo OWNER TO postgres;

--
-- Name: rr_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rr_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_repo_id uuid NOT NULL,
    type text DEFAULT 'document'::text NOT NULL,
    type_other_desc text,
    filename text,
    url text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.rr_attachments OWNER TO postgres;

--
-- Name: sector; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sector (
    id bigint NOT NULL,
    parent_id bigint,
    sectorname text NOT NULL,
    description text,
    level bigint DEFAULT 1 NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sector OWNER TO postgres;

--
-- Name: sector_disaster_records_relation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sector_disaster_records_relation (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_id bigint NOT NULL,
    disaster_record_id uuid NOT NULL,
    with_damage boolean,
    damage_cost numeric,
    damage_cost_currency text,
    damage_recovery_cost numeric,
    damage_recovery_cost_currency text,
    with_disruption boolean,
    with_losses boolean,
    losses_cost numeric,
    losses_cost_currency text,
    api_import_id text
);


ALTER TABLE public.sector_disaster_records_relation OWNER TO postgres;

--
-- Name: sector_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sector_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sector_id_seq OWNER TO postgres;

--
-- Name: sector_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sector_id_seq OWNED BY public.sector.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id bigint NOT NULL,
    last_active_at timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone NOT NULL,
    totp_authed boolean DEFAULT false NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- Name: unit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit (
    api_import_id text,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text DEFAULT 'area'::text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.unit OWNER TO postgres;

--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id bigint NOT NULL,
    role text DEFAULT ''::text NOT NULL,
    first_name text DEFAULT ''::text NOT NULL,
    last_name text DEFAULT ''::text NOT NULL,
    email text NOT NULL,
    password text DEFAULT ''::text NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    email_verification_code text DEFAULT ''::text NOT NULL,
    email_verification_sent_at timestamp without time zone,
    email_verification_expires_at timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone NOT NULL,
    invite_code text DEFAULT ''::text NOT NULL,
    invite_sent_at timestamp without time zone,
    invite_expires_at timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone NOT NULL,
    reset_password_token text DEFAULT ''::text NOT NULL,
    reset_password_expires_at timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone NOT NULL,
    totp_enabled boolean DEFAULT false NOT NULL,
    totp_secret text DEFAULT ''::text NOT NULL,
    totp_secret_url text DEFAULT ''::text NOT NULL,
    organization text DEFAULT ''::text NOT NULL,
    hydromet_che_user boolean DEFAULT false NOT NULL,
    auth_type text DEFAULT 'form'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: __drizzle_migrations__ id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.__drizzle_migrations__ ALTER COLUMN id SET DEFAULT nextval('public.__drizzle_migrations___id_seq'::regclass);


--
-- Name: api_key id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_key ALTER COLUMN id SET DEFAULT nextval('public.api_key_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: country1 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country1 ALTER COLUMN id SET DEFAULT nextval('public.country1_id_seq'::regclass);


--
-- Name: dev_example1 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dev_example1 ALTER COLUMN id SET DEFAULT nextval('public.dev_example1_id_seq'::regclass);


--
-- Name: division id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division ALTER COLUMN id SET DEFAULT nextval('public.division_id_seq'::regclass);


--
-- Name: sector id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector ALTER COLUMN id SET DEFAULT nextval('public.sector_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: __drizzle_migrations__ __drizzle_migrations___pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.__drizzle_migrations__
    ADD CONSTRAINT __drizzle_migrations___pkey PRIMARY KEY (id);


--
-- Name: affected affected_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affected
    ADD CONSTRAINT affected_pkey PRIMARY KEY (id);


--
-- Name: api_key api_key_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_pkey PRIMARY KEY (id);


--
-- Name: api_key api_key_secret_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_secret_unique UNIQUE (secret);


--
-- Name: asset asset_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: asset asset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: commonPasswords commonPasswords_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."commonPasswords"
    ADD CONSTRAINT "commonPasswords_pkey" PRIMARY KEY (password);


--
-- Name: country1 country1_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.country1
    ADD CONSTRAINT country1_pkey PRIMARY KEY (id);


--
-- Name: damages damages_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: damages damages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_pkey PRIMARY KEY (id);


--
-- Name: deaths deaths_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deaths
    ADD CONSTRAINT deaths_pkey PRIMARY KEY (id);


--
-- Name: dev_example1 dev_example1_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dev_example1
    ADD CONSTRAINT dev_example1_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: dev_example1 dev_example1_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dev_example1
    ADD CONSTRAINT dev_example1_pkey PRIMARY KEY (id);


--
-- Name: sector_disaster_records_relation disRecSectorsUniqueIdx; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT "disRecSectorsUniqueIdx" UNIQUE (disaster_record_id, sector_id);


--
-- Name: disaster_event disaster_event_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: disaster_event disaster_event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_pkey PRIMARY KEY (id);


--
-- Name: disaster_records disaster_records_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: disaster_records disaster_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_pkey PRIMARY KEY (id);


--
-- Name: displaced displaced_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.displaced
    ADD CONSTRAINT displaced_pkey PRIMARY KEY (id);


--
-- Name: disruption disruption_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disruption
    ADD CONSTRAINT disruption_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: disruption disruption_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disruption
    ADD CONSTRAINT disruption_pkey PRIMARY KEY (id);


--
-- Name: division division_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division
    ADD CONSTRAINT division_import_id_unique UNIQUE (import_id);


--
-- Name: division division_national_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division
    ADD CONSTRAINT division_national_id_unique UNIQUE (national_id);


--
-- Name: division division_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division
    ADD CONSTRAINT division_pkey PRIMARY KEY (id);


--
-- Name: event event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event
    ADD CONSTRAINT event_pkey PRIMARY KEY (id);


--
-- Name: hazardous_event hazardous_event_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: hazardous_event hazardous_event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_pkey PRIMARY KEY (id);


--
-- Name: hip_class hip_class_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hip_class
    ADD CONSTRAINT hip_class_pkey PRIMARY KEY (id);


--
-- Name: hip_cluster hip_cluster_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hip_cluster
    ADD CONSTRAINT hip_cluster_pkey PRIMARY KEY (id);


--
-- Name: hip_hazard hip_hazard_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hip_hazard
    ADD CONSTRAINT hip_hazard_pkey PRIMARY KEY (id);


--
-- Name: human_category_presence human_category_presence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.human_category_presence
    ADD CONSTRAINT human_category_presence_pkey PRIMARY KEY (id);


--
-- Name: human_dsg human_dsg_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.human_dsg
    ADD CONSTRAINT human_dsg_pkey PRIMARY KEY (id);


--
-- Name: injured injured_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.injured
    ADD CONSTRAINT injured_pkey PRIMARY KEY (id);


--
-- Name: losses losses_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.losses
    ADD CONSTRAINT losses_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: losses losses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.losses
    ADD CONSTRAINT losses_pkey PRIMARY KEY (id);


--
-- Name: measure measure_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.measure
    ADD CONSTRAINT measure_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: measure measure_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.measure
    ADD CONSTRAINT measure_pkey PRIMARY KEY (id);


--
-- Name: missing missing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missing
    ADD CONSTRAINT missing_pkey PRIMARY KEY (id);


--
-- Name: noneco_losses noneco_losses_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT noneco_losses_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: noneco_losses noneco_losses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT noneco_losses_pkey PRIMARY KEY (id);


--
-- Name: noneco_losses nonecolosses_sectorIdx; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT "nonecolosses_sectorIdx" UNIQUE (disaster_record_id, category_id);


--
-- Name: resource_repo resource_repo_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resource_repo
    ADD CONSTRAINT resource_repo_pkey PRIMARY KEY (id);


--
-- Name: rr_attachments rr_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_attachments
    ADD CONSTRAINT rr_attachments_pkey PRIMARY KEY (id);


--
-- Name: sector_disaster_records_relation sector_disaster_records_relation_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT sector_disaster_records_relation_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: sector_disaster_records_relation sector_disaster_records_relation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT sector_disaster_records_relation_pkey PRIMARY KEY (id);


--
-- Name: sector sector_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector
    ADD CONSTRAINT sector_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: unit unit_api_import_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit
    ADD CONSTRAINT unit_api_import_id_unique UNIQUE (api_import_id);


--
-- Name: unit unit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit
    ADD CONSTRAINT unit_pkey PRIMARY KEY (id);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: division_bbox_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX division_bbox_idx ON public.division USING gist (bbox);


--
-- Name: division_geom_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX division_geom_idx ON public.division USING gist (geom);


--
-- Name: division_level_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX division_level_idx ON public.division USING btree (level);


--
-- Name: parent_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX parent_idx ON public.division USING btree (parent_id);


--
-- Name: sector_disaster_records_relation_disaster_record_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sector_disaster_records_relation_disaster_record_id_idx ON public.sector_disaster_records_relation USING btree (disaster_record_id);


--
-- Name: sector_disaster_records_relation_sector_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sector_disaster_records_relation_sector_id_idx ON public.sector_disaster_records_relation USING btree (sector_id);


--
-- Name: affected affected_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affected
    ADD CONSTRAINT affected_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: api_key api_key_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_key
    ADD CONSTRAINT api_key_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- Name: audit_logs audit_logs_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_categories_id_fk FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: damages damages_asset_id_asset_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_asset_id_asset_id_fk FOREIGN KEY (asset_id) REFERENCES public.asset(id);


--
-- Name: damages damages_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: damages damages_sector_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.damages
    ADD CONSTRAINT damages_sector_id_sector_id_fk FOREIGN KEY (sector_id) REFERENCES public.sector(id);


--
-- Name: deaths deaths_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deaths
    ADD CONSTRAINT deaths_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: disaster_event disaster_event_disaster_event_id_disaster_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_disaster_event_id_disaster_event_id_fk FOREIGN KEY (disaster_event_id) REFERENCES public.disaster_event(id);


--
-- Name: disaster_event disaster_event_hazardous_event_id_hazardous_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_hazardous_event_id_hazardous_event_id_fk FOREIGN KEY (hazardous_event_id) REFERENCES public.hazardous_event(id);


--
-- Name: disaster_event disaster_event_hip_cluster_id_hip_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_hip_cluster_id_hip_cluster_id_fk FOREIGN KEY (hip_cluster_id) REFERENCES public.hip_cluster(id);


--
-- Name: disaster_event disaster_event_hip_hazard_id_hip_hazard_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_hip_hazard_id_hip_hazard_id_fk FOREIGN KEY (hip_hazard_id) REFERENCES public.hip_hazard(id);


--
-- Name: disaster_event disaster_event_hip_type_id_hip_class_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_hip_type_id_hip_class_id_fk FOREIGN KEY (hip_type_id) REFERENCES public.hip_class(id);


--
-- Name: disaster_event disaster_event_id_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_event
    ADD CONSTRAINT disaster_event_id_event_id_fk FOREIGN KEY (id) REFERENCES public.event(id);


--
-- Name: disaster_records disaster_records_disaster_event_id_disaster_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_disaster_event_id_disaster_event_id_fk FOREIGN KEY (disaster_event_id) REFERENCES public.disaster_event(id);


--
-- Name: disaster_records disaster_records_hip_cluster_id_hip_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_hip_cluster_id_hip_cluster_id_fk FOREIGN KEY (hip_cluster_id) REFERENCES public.hip_cluster(id);


--
-- Name: disaster_records disaster_records_hip_hazard_id_hip_hazard_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_hip_hazard_id_hip_hazard_id_fk FOREIGN KEY (hip_hazard_id) REFERENCES public.hip_hazard(id);


--
-- Name: disaster_records disaster_records_hip_type_id_hip_class_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disaster_records
    ADD CONSTRAINT disaster_records_hip_type_id_hip_class_id_fk FOREIGN KEY (hip_type_id) REFERENCES public.hip_class(id);


--
-- Name: displaced displaced_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.displaced
    ADD CONSTRAINT displaced_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: disruption disruption_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disruption
    ADD CONSTRAINT disruption_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: disruption disruption_sector_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disruption
    ADD CONSTRAINT disruption_sector_id_sector_id_fk FOREIGN KEY (sector_id) REFERENCES public.sector(id);


--
-- Name: division division_parent_id_division_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.division
    ADD CONSTRAINT division_parent_id_division_id_fk FOREIGN KEY (parent_id) REFERENCES public.division(id);


--
-- Name: event_relationship event_relationship_child_id_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_relationship
    ADD CONSTRAINT event_relationship_child_id_event_id_fk FOREIGN KEY (child_id) REFERENCES public.event(id);


--
-- Name: event_relationship event_relationship_parent_id_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_relationship
    ADD CONSTRAINT event_relationship_parent_id_event_id_fk FOREIGN KEY (parent_id) REFERENCES public.event(id);


--
-- Name: hazardous_event hazardous_event_hip_cluster_id_hip_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_hip_cluster_id_hip_cluster_id_fk FOREIGN KEY (hip_cluster_id) REFERENCES public.hip_cluster(id);


--
-- Name: hazardous_event hazardous_event_hip_hazard_id_hip_hazard_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_hip_hazard_id_hip_hazard_id_fk FOREIGN KEY (hip_hazard_id) REFERENCES public.hip_hazard(id);


--
-- Name: hazardous_event hazardous_event_hip_type_id_hip_class_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_hip_type_id_hip_class_id_fk FOREIGN KEY (hip_type_id) REFERENCES public.hip_class(id);


--
-- Name: hazardous_event hazardous_event_id_event_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hazardous_event
    ADD CONSTRAINT hazardous_event_id_event_id_fk FOREIGN KEY (id) REFERENCES public.event(id);


--
-- Name: hip_cluster hip_cluster_type_id_hip_class_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hip_cluster
    ADD CONSTRAINT hip_cluster_type_id_hip_class_id_fk FOREIGN KEY (type_id) REFERENCES public.hip_class(id);


--
-- Name: hip_hazard hip_hazard_cluster_id_hip_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hip_hazard
    ADD CONSTRAINT hip_hazard_cluster_id_hip_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.hip_cluster(id);


--
-- Name: human_category_presence human_category_presence_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.human_category_presence
    ADD CONSTRAINT human_category_presence_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: human_dsg human_dsg_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.human_dsg
    ADD CONSTRAINT human_dsg_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: injured injured_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.injured
    ADD CONSTRAINT injured_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: losses losses_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.losses
    ADD CONSTRAINT losses_record_id_disaster_records_id_fk FOREIGN KEY (record_id) REFERENCES public.disaster_records(id);


--
-- Name: losses losses_sector_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.losses
    ADD CONSTRAINT losses_sector_id_sector_id_fk FOREIGN KEY (sector_id) REFERENCES public.sector(id);


--
-- Name: missing missing_dsg_id_human_dsg_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.missing
    ADD CONSTRAINT missing_dsg_id_human_dsg_id_fk FOREIGN KEY (dsg_id) REFERENCES public.human_dsg(id);


--
-- Name: noneco_losses noneco_losses_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT noneco_losses_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: noneco_losses noneco_losses_disaster_record_id_disaster_records_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.noneco_losses
    ADD CONSTRAINT noneco_losses_disaster_record_id_disaster_records_id_fk FOREIGN KEY (disaster_record_id) REFERENCES public.disaster_records(id);


--
-- Name: rr_attachments rr_attachments_resource_repo_id_resource_repo_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rr_attachments
    ADD CONSTRAINT rr_attachments_resource_repo_id_resource_repo_id_fk FOREIGN KEY (resource_repo_id) REFERENCES public.resource_repo(id);


--
-- Name: sector_disaster_records_relation sector_disaster_records_relation_disaster_record_id_disaster_re; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT sector_disaster_records_relation_disaster_record_id_disaster_re FOREIGN KEY (disaster_record_id) REFERENCES public.disaster_records(id);


--
-- Name: sector_disaster_records_relation sector_disaster_records_relation_sector_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector_disaster_records_relation
    ADD CONSTRAINT sector_disaster_records_relation_sector_id_sector_id_fk FOREIGN KEY (sector_id) REFERENCES public.sector(id);


--
-- Name: sector sector_parent_id_sector_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sector
    ADD CONSTRAINT sector_parent_id_sector_id_fk FOREIGN KEY (parent_id) REFERENCES public.sector(id);


--
-- Name: session session_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id);


--
-- PostgreSQL database dump complete
--

