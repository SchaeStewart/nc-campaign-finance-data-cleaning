/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.alterColumn('contributors', 'id', {
        default: pgm.func('gen_random_uuid()')
    })
    pgm.alterColumn('contributions', 'source_contribution_id', {
        notNull: true
    })
};

exports.down = pgm => {};
