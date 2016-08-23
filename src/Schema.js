import lf from 'lovefield'

const getSchema = () => {
  let schema = lf.schema.create('lovebug', 1)

  // Project table
  schema.createTable('Project')
  .addColumn('id', lf.Type.INTEGER)
  .addColumn('org', lf.Type.STRING)
  .addColumn('repo', lf.Type.STRING)
  .addColumn('count', lf.Type.INTEGER)
  .addColumn('private', lf.Type.BOOL)
  .addPrimaryKey(['id'])

  // Issue table
  schema.createTable('Issue')
  .addColumn('id', lf.Type.INTEGER)
  .addColumn('state', lf.Type.STRING)
  .addColumn('title', lf.Type.STRING)
  .addColumn('updated_at', lf.Type.DATE_TIME)
  .addColumn('comments', lf.Type.INTEGER)
  .addColumn('extract', lf.Type.STRING)
  .addColumn('last_actor', lf.Type.OBJECT)
  .addColumn('metadata', lf.Type.OBJECT)
  .addColumn('_html', lf.Type.STRING)
  .addColumn('new', lf.Type.BOOL)
  .addColumn('project_id', lf.Type.INTEGER)
  .addForeignKey('fk_project_id', {
    local: 'project_id',
    ref: 'Project.id',
    action: lf.ConstraintAction.CASCADE
  })
  .addPrimaryKey(['id'])
  .addNullable(['last_actor', 'extract'])
  .addIndex('idxState', ['state'], false)
  .addIndex('idxUpdatedAt', ['updated_at'], false, lf.Order.DESC)

  // Comment table
  schema.createTable('Comment')
  .addColumn('id', lf.Type.INTEGER)
  .addColumn('created_at', lf.Type.DATE_TIME)
  .addColumn('updated_at', lf.Type.DATE_TIME)
  .addColumn('metadata', lf.Type.OBJECT)
  .addColumn('_html', lf.Type.STRING)
  .addColumn('issue_id', lf.Type.INTEGER)
  .addForeignKey('fk_issue_id', {
    local: 'issue_id',
    ref: 'Issue.id',
    action: lf.ConstraintAction.CASCADE
  })
  .addColumn('project_id', lf.Type.INTEGER)
  .addForeignKey('fk_project_id', {
    local: 'project_id',
    ref: 'Project.id',
    action: lf.ConstraintAction.CASCADE
  })
  .addPrimaryKey(['id'])
  .addIndex('idxIssueId', ['issue_id'])
  .addIndex('idxCreatedAt', ['created_at'], false, lf.Order.ASC)

  return schema
}

export default getSchema
