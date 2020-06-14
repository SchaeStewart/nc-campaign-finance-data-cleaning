/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.dropIndex(
    'raw_contributions',
    ['name', 'street_line_1', 'street_line_2'],
    {
      name: 'raw_contributions_name_street_idx',
    }
  )
  pgm.sql(
      'CREATE INDEX IF NOT EXISTS raw_contributions_name_street_idx ON raw_contributions USING GIN(name gin_trgm_ops, street_line_1 gin_trgm_ops);'
  );
  pgm.sql('CREATE INDEX IF NOT EXISTS source_contributions_id_idx ON contributions using Gist (source_contribution_id)')
};

exports.down = pgm => {
  pgm.dropIndex(
    'raw_contributions',
    ['name', 'street_line_1'],
    {
      name: 'raw_contributions_name_street_idx',
    }
  )
  pgm.createIndex(
    'raw_contributions',
    ['name', 'street_line_1', 'street_line_2'],
    {
      name: 'raw_contributions_name_street_idx',
      method: 'gist',
      ifNotExists: 'true',
    },
  );
  pgm.sql('DROP INDEX IF EXISTS source_contributions_id_idx')
};
