CREATE TABLE analytics_events (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    session_id uuid NOT NULL,
    event_name varchar(64) NOT NULL CHECK (
        event_name IN (
            'recipe_input_started',
            'recipe_structure_requested',
            'recipe_structure_succeeded',
            'recipe_structure_failed',
            'recipe_result_edited',
            'recipe_saved'
        )
    ),
    properties jsonb NOT NULL CHECK (jsonb_typeof(properties) = 'object'),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_event_time ON analytics_events (
    event_name,
    created_at DESC
);

CREATE INDEX idx_analytics_events_session_time ON analytics_events (
    session_id,
    created_at
);
