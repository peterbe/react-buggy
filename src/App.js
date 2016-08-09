import React, { Component } from 'react'
import Layout from './Layout'
import Dialog from './Dialog'
import Nav from './Nav'
import List from './List'
import Main from './Main'
import APIDialog from './APIDialog'
import { makeExtract } from './Utils'
import parse from 'parse-link-header'
import elasticlunr from 'elasticlunr'
import lf from 'lovefield'
import getSchema from './Schema'
import { SLICE_START, SLICE_INCREMENT } from './Constants'

// If you use React Router, make this component
// render <Router> with your routes. Currently,
// only synchronous routes are hot reloaded, and
// you will see a warning from <Router> on every reload.
// You can ignore this warning. For details, see:
// https://github.com/reactjs/react-router/issues/2182

export default class App extends Component {

  constructor(props) {
    super(props)
    this.state = {
      countStatuses: {},
      selectedStatuses: [],
      projects: [],
      fetching: null,
      // issuesAll: [],
      issues: [],
      issue: null,
      comments: [],
      showConfig: false,
      showAbout: false,
      ratelimitLimit: 60,
      ratelimitRemaining: 60,

      // for the list
      selectedProjects: [],
      slice: SLICE_START,
      search: '',

    }
    this.selectStatus = this.selectStatus.bind(this)
    this.fetchResponseProxy = this.fetchResponseProxy.bind(this)
    // this.readIssues = this.readIssues.bind(this)
  }

  componentWillMount() {
    this.schemaBuilder = getSchema()

  }
  componentDidMount() {
    this.schemaBuilder.connect().then(db => {
      this.db = db
      this.setState({db: db})
      let projectsTable = db.getSchema().table('Project');
      db.select().from(projectsTable).exec().then(results => {
        this.setState({projects: results})
        for (var project of results) {
          this.downloadNewIssues(project)
        }
      })
      this.recountStatuses()
      this.loadIssues()
    })
    // this.db.projects.toArray().then(results => {
    //   if (results.length) {
    //     this.setState({projects: results})
    //     // for (var project of results) {
    //     //   this.downloadNewIssues(project)
    //     // }
    //   }
    // })
    // // this.readIssues()
    // this.recountStatuses()
  }

  componentWillUnmount() {
    if (this.db) {
      this.db.closeDatabase()  // not sure if this is needed but feels good
    }
  }

  fetchResponseProxy(response) {
    if (response.headers.has('X-RateLimit-Limit') && response.headers.has('X-RateLimit-Remaining')) {
      this.setState({
        ratelimitLimit: parseInt(response.headers.get('X-RateLimit-Limit'), 10),
        ratelimitRemaining: parseInt(response.headers.get('X-RateLimit-Remaining'), 10),
      })
    }
    return response
  }

  recountStatuses() {
    let table = this.db.getSchema().table('Issue')

    this.db.select(lf.fn.count(table.id)).from(table)
    .where(table.state.eq('open')).exec().then(results => {
      let counts = this.state.countStatuses
      counts.open = results[0]['COUNT(id)']
      this.setState({countStatuses: counts})
    })

    this.db.select(lf.fn.count(table.id)).from(table)
    .where(table.state.eq('closed')).exec().then(results => {
      let counts = this.state.countStatuses
      counts.closed = results[0]['COUNT(id)']
      this.setState({countStatuses: counts})
    })
  }

  loadIssues() {
    // query the database and set issues in this.state
    let issues = []
    let projects = this.state.selectedProjects
    let search = this.state.search
    let slice = this.state.slice
    let offset = this.state.offset || 0
    // let offset=0

    let projectsTable = this.db.getSchema().table('Project')
    let table = this.db.getSchema().table('Issue')

    let countQuery = this.db.select(lf.fn.count(table.id))
    .from(table)
    .innerJoin(projectsTable, table.project_id.eq(projectsTable.id))

    let query = this.db.select()
    .from(table)
    .innerJoin(projectsTable, table.project_id.eq(projectsTable.id))

    if (projects && projects.length) {
      let projectIds = projects.map(p => p.id)
      query = query.where(table.project_id.in(projectIds))
      countQuery = countQuery.where(table.project_id.in(projectIds))
    }

    if (!slice) {
      slice = SLICE_START
    }


    // count how many we'd get back if we didn't limit
    countQuery.exec().then(result => {
      let count = result[0].Issue['COUNT(id)']
      this.setState({canLoadMore: count > slice})
    })

    query = query.limit(slice)
    if (offset) {
      query = query.offset(offset)
    }

    // console.log('QUERY', query);
    query.orderBy(table.updated_at, lf.Order.DESC).exec().then(results => {
      let issues = results.map(result => {
        // mutating the result. Bad idea??
        result.Issue.project = result.Project
        return result.Issue
      })
      this.setState({
        issues: issues,
        searching: false,
        loadingMore: false,
      })
    })

  }

  // readIssues() {
  //   return this.db.issues.orderBy('updated_at_ts').reverse().toArray().then(issues => {
  //     this.setState({issuesAll: issues})
  //     this.updateLunr()
  //   })
  // }

  downloadNewIssues(project) {
    // Download all open and closed issues we can find for this
    // project.

    let maxDeepFetches = 20
    let deepFetches = 0
    const downloadIssues = (url) => {
      return fetch(url)
      .then(this.fetchResponseProxy)
      .then(r => {
        if (r.status === 200) {
          if (r.headers.get('Link') && deepFetches >= maxDeepFetches) {
            console.warn(
              'NOTE! Downloaded ' + maxDeepFetches + 'pages but could go on'
            )
          }
          if (r.headers.get('Link') && deepFetches < maxDeepFetches) {
            let parsedLink = parse(r.headers.get('Link'))
            if (parsedLink.next) {
              deepFetches++
              downloadIssues(parsedLink.next.url)
            }
          }
          return r.json()
        }
      })
      .then(issues => {
        if (issues) {
          // let projectsTable = this.db.getSchema().table('Project')
          let issuesTable = this.db.getSchema().table('Issue')
          // this.db.select().from(projectsTable).where(projectsTable.id.eq(project.id)).exec()
          // .then(projectRow => {
          //   console.log('projectRow', projectRow);

            let rows = issues.map(issue => {
              return issuesTable.createRow({
                id: issue.id,
                state: issue.state,
                title: issue.title,
                updated_at: new Date(issue.updated_at),
                comments: issue.comments,
                extract: issue.body,
                last_actor: null,
                metadata: issue,
                project: project,
                // project: projectRow,
                project_id: project.id,
              })
            })

            return this.db.insertOrReplace().into(issuesTable).values(rows).exec()
            .then(inserted => {
              console.log("Inserted...", inserted.length, 'issues for ', project.org, project.repo);
            })

          // })

          // XXX Need to download closed ones too
        }
      })
      // .catch(err => {
      //   console.warn('Unable to download issues from ' + url);
      //   console.error(err);
      // })
    }
    let url = 'https://api.github.com'
    url += `/repos/${project.org}/${project.repo}/issues`
    return downloadIssues(url)

  }

  selectStatus(status) {
    console.log('STATUS', status)
  }

  addProject(project) {
    if (!this.state.projects.find(p => p.id === project.id)) {
      let projects = this.state.projects
      projects.push(project)
      this.setState({projects: projects})

      // save it persistently too
      // this.db.projects.add(project)
      let projectsTable = this.db.getSchema().table('Project')
      let row = projectsTable.createRow({
        id: project.id,
        org: project.org,
        repo: project.repo,
        count: project.count,
        private: project.private,
      })
      this.db.insertOrReplace().into(projectsTable).values([row]).exec()
      .then(inserted => {
        console.log("Inserted...", inserted.length, 'projects');
        this.downloadNewIssues(project)
        .then(() => {
          if (!this.state.issues.length) {
            this.loadIssues()
          }
        })
      })

    }

  }

  removeProject(project) {
    let filtered = this.state.projects.filter(p => {
      return p.id !== project.id
    })
    let stateChange = {projects: filtered}
    if (this.state.issue && this.state.issue.project.id === project.id) {
      stateChange.issue = null
    }
    // stateChange.issuesAll = this.state.issuesAll.filter(i => {
    //   return i.project.id !== project.id
    // })
    this.setState(stateChange)

    throw new Error('work harder')
    this.db.comments
    .where('project_id')
    .equals(project.id)
    .delete()

    this.db.issues
    .where('project_id')
    .equals(project.id)
    .delete()

    this.db.projects
    .where('id')
    .equals(project.id)
    .delete()

  }

  _clearAll(e) {
    e.preventDefault()
    this.db.close()
    // let r = indexedDB.deleteDatabase('buggy')
    let r = indexedDB.deleteDatabase('lovebug')
    r.onsuccess = () => {
      alert('All cleared')
      document.location.reload(1)
    }
    r.onblocked = () => {
      alert('DB blocked')
    }
    r.onerror = () => {
      alert('Could not delete database');
    }
  }

  issueClicked(issue) {
    this.setState({issue: issue, showConfig: false})
    this.refreshIssue(issue)
    // this.readComments(issue).then(() => {
    //   this.updateIssueComments(issue).then(() => {
    //     this.readComments(issue)
    //   })
    // })
  }

  readComments(issue) {
    // XXX Needs an orderBy('created_at_ts')
    let issuesTable = this.db.getSchema().table('Issue')
    let commentsTable = this.db.getSchema().table('Comment')
    let comments = []
    return this.db.select().from(commentsTable)
    .where(commentsTable.issue_id.eq(issue.id))
    .exec().then(results => {
      console.log('COmments Results', results);
    })

    // return this.db.comments
    // .where('issue_id')
    // .equals(issue.id)
    // .toArray()
    // .then(comments => {
    //   if (comments.length) {
    //     let lastComment = comments[comments.length - 1]
    //     // console.log(lastComment);
    //     issue.extract = makeExtract(lastComment.metadata.body)
    //     issue.last_actor = lastComment.metadata.user
    //     this.db.issues.put(issue)
    //     this.setState({comments: comments})
    //   } else {
    //     this.setState({comments: []})
    //   }
    //
    // })

  }

  updateIssueComments(issue) {
    let url = 'https://api.github.com/'
    url += `repos/${issue.project.org}/${issue.project.repo}/issues/`
    url += `${issue.metadata.number}/comments`
    // XXX needs pagination
    return fetch(url)
    .then(this.fetchResponseProxy)
    .then(r => r.json())
    .then(comments => {
      let commentsTable = this.db.getSchema().table('Comment')
      let wrapped = comments.map(comment => {
        return {
          id: comment.id,
          created_at: new Date(comment.created_at),
          metadata: comment,
          issue_id: issue.id,
          project_id: issue.project.id,
        }
        // return commentsTable.createRow(wrapped)
      })
      // XXX Needs to update the issue's "extract" and "latest_comment" (for avatar)

      let rows = wrapped.map(c => commentsTable.createRow(c))
      return this.db.insertOrReplace().into(commentsTable).values(rows).exec()
      .then(inserted => {
        if (this.state.issue && this.state.issue.id === issue.id) {
          // this is the current open issue, update the comments state
          this.readComments(issue)
        }
      })
    })
  }

  refreshIssue(issue) {
    // reload the individual issue and update issue's comments
    let url = 'https://api.github.com/'
    url += `repos/${issue.project.org}/${issue.project.repo}/issues/`
    url += `${issue.metadata.number}`

    return fetch(url)
    .then(this.fetchResponseProxy)
    .then(r => r.json())
    .then(response => {

      let issuesTable = this.db.getSchema().table('Issue')
      let issueWrapped = {
        id: issue.id,
        state: response.state,
        title: response.title,
        updated_at: new Date(response.updated_at),
        comments: response.comments,
        extract: response.body,
        last_actor: null,
        metadata: response,
        project_id: issue.project_id,
      }
      var row = issuesTable.createRow(issueWrapped)
      return this.db.insertOrReplace().into(issuesTable).values([row]).exec()
      .then(inserted => {
        return this.updateIssueComments(issue)
      })
      if (this.state.issue && this.state.issue.id === response.id) {
        // this is the current open issue, update state.
        this.setState({issue: issueWrapped})
      }
      // // let's also update the list of all issues
      // let issuesAll = this.state.issuesAll.map(i => {
      //   if (i.id === issueWrapped.id) {
      //     return issueWrapped
      //   } else {
      //     return i
      //   }
      // })
      // this.setState({issuesAll: issuesAll})

    })

  }

  toggleShowConfig() {
    this.setState({showConfig: !this.state.showConfig})
  }

  increaseSlice() {
    this.setState({
      slice: this.state.slice + SLICE_INCREMENT,
      loadingMore: true,
    }, this.loadIssues)
  }

  searchChanged(search) {
    this.setState({
      search: search,
      searching: true
    }, this.loadIssues)
  }

  projectsSelected(projects) {
    this.setState({
      selectedProjects: projects,
      searching: true
    }, this.loadIssues)
  }

  render() {
    return (
      <Layout>
        <APIDialog
          toggleShowConfig={()=> this.toggleShowConfig()}
          ratelimitLimit={this.state.ratelimitLimit}
          ratelimitRemaining={this.state.ratelimitRemaining}
          />
        <Nav
          countStatuses={this.state.countStatuses}
          selectedStatuses={this.state.selectedStatuses}
          selectStatus={this.selectStatus}
          toggleShowConfig={()=> this.toggleShowConfig()}
          ratelimitLimit={this.state.ratelimitLimit}
          ratelimitRemaining={this.state.ratelimitRemaining}
          _clearAll={(e) => this._clearAll(e)}
          />
        <List
          projectsAll={this.state.projects}
          selectedProjects={this.state.selectedProjects}
          issueClicked={i => this.issueClicked(i)}
          activeIssue={this.state.issue}
          issues={this.state.issues}
          increaseSlice={() => this.increaseSlice()}
          searchChanged={search => this.searchChanged(search)}
          projectsSelected={projects => this.projectsSelected(projects)}
          loadingMore={this.state.loadingMore}
          canLoadMore={this.state.canLoadMore}
          />
        <Main
          projects={this.state.projects}
          addProject={p => this.addProject(p)}
          removeProject={p => this.removeProject(p)}
          issue={this.state.issue}
          comments={this.state.comments}
          showConfig={this.state.showConfig}
          showAbout={this.state.showAbout}
          db={this.db}
          fetchResponseProxy={this.fetchResponseProxy}
          refreshIssue={i => this.refreshIssue(i)}
          />
      </Layout>
    )
  }
}
