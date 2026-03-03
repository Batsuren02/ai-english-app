-- Add drill configuration columns to user_profile
alter table user_profile
add column drill_ease_threshold numeric default 2.8,
add column drill_session_length integer default 10;

-- Add index for easier querying
create index idx_user_profile_drill_config on user_profile(id, drill_ease_threshold, drill_session_length);
