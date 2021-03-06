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
import { generateMarkdownHtml } from './Common'

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
    // Maintain a mapping of *when* we download an issue's comments.
    this.issueCommentsUpdatedAt = {}
    // Maintain a mapping of *when* we download a project's issues.
    this.projectsUpdatedAt = {}

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
      this.loadIssues().then(() => {
        let activeissueId = sessionStorage.getItem('activeissue')
        if (activeissueId) {
          this.state.issues.forEach(issue => {
            // equality solves the problem of comparing an in with a string
            if (issue.id == activeissueId) {
              this.issueClicked(issue)
            }
          })
        }
      })
      this.loadLunr()
    })
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
    let statuses = this.state.selectedStatuses
    let search = this.state.search
    let slice = this.state.slice
    let offset = this.state.offset || 0
    // let offset=0


    let searchScores = null
    let issueIds = null
    if (search) {
      // find the Ids
      let t0 = performance.now()
      let res = this.lunrindex.search(search, {
        fields: {
          title: {boost: 2},
          body: {boost: 1}
        },
        expand: true,
      })
      let t1 = performance.now()
      console.log("Took", (t1 - t0) / 1000, 'ms to find ', res.length, 'issues');
      searchScores = {}
      issueIds = res.map(res => {
        let issueId = parseInt(res.ref, 10)
        searchScores[issueId] = res.score
        return issueId
      })
      console.log('FOUND', issueIds.length, 'issues');
      if (!issueIds.length) {
        // exit early!
        this.setState({
          issues: [],
          searching: false,
          loadingMore: false
        })
        return
      }
    }

    let projectsTable = this.db.getSchema().table('Project')
    let table = this.db.getSchema().table('Issue')

    let countQuery = this.db.select(lf.fn.count(table.id))
    .from(table)
    .innerJoin(projectsTable, table.project_id.eq(projectsTable.id))

    let query = this.db.select()
    .from(table)
    .innerJoin(projectsTable, table.project_id.eq(projectsTable.id))

    if (issueIds) {
      query = query.where(table.id.in(issueIds))
      countQuery = countQuery.where(table.id.in(issueIds))
    }
    if (projects && projects.length) {
      let projectIds = projects.map(p => p.id)
      query = query.where(table.project_id.in(projectIds))
      countQuery = countQuery.where(table.project_id.in(projectIds))
    }

    if (statuses && statuses.length) {
      if (statuses === ['assigned']) {
        throw new Error('work harder')
      }
      query = query.where(table.state.in(statuses))
      countQuery = countQuery.where(table.state.in(statuses))
    }

    if (!slice) {
      slice = SLICE_START
    }

    // count how many we'd get back if we didn't limit
    countQuery.exec().then(result => {
      let count = result[0].Issue['COUNT(id)']
      this.setState({canLoadMore: count > slice})
    })
    if (!searchScores) {
      query = query.limit(slice)
      if (offset) {
        query = query.offset(offset)
      }
      query = query.orderBy(table.updated_at, lf.Order.DESC)
    }
    // console.log('QUERY', query);
    return query.exec().then(results => {
      let issues = results.map(result => {
        // mutating the result. Bad idea??
        result.Issue.project = result.Project
        return result.Issue
      })
      if (searchScores) {
        issues.sort((a, b) => {
          let sa = searchScores[a.id]
          let sb = searchScores[b.id]
          if (sa > sb) {
            return -1
          } else if (sb > sa) {
            return 1
          }
          if (a.updated_at.getTime() > b.updated_at.getTime()) {
            return -1
          }
          return 1
        })
        issues = issues.slice(0, slice)
      }
      this.setState({
        issues: issues,
        searching: false,
        loadingMore: false,
      }, this.updateIssueCommentsByLoaded)
    })

  }

  loadLunr() {
    let t0 = performance.now()
    this.lunrindex = elasticlunr(function() {
      this.addField('title')
      this.addField('body')
      this.addField('type')
      this.setRef('id')
      // not store the original JSON document to reduce the index size
      this.saveDocument(false)
    })

    let table = this.db.getSchema().table('Issue')
    let query = this.db.select().from(table)
    query.exec().then(results => {
      results.forEach(issue => {
        this.lunrindex.addDoc({
          id: issue.id,
          title: issue.title,
          body: issue.metadata.body,
          type: 'ISSUE',
        })
      })
      let t1 = performance.now()
      console.log('THAT TOOK ' + (t1 - t0)/ 1000);
    })

  }

  downloadNewIssues(project) {
    // Download all open and closed issues we can find for this
    // project.
    let issuesTable = this.db.getSchema().table('Issue')
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
          let rows = issues.map(issue => {
            return this._createIssueRow(issuesTable, {
              id: issue.id,
              state: issue.state,
              title: issue.title,
              _html: generateMarkdownHtml(issue.body),
              updated_at: new Date(issue.updated_at),
              comments: issue.comments,
              extract: null,
              last_actor: null,
              metadata: issue,
              new: true,
              // project: project,
              project_id: project.id,
            })
          })

          return this.db.insertOrReplace().into(issuesTable).values(rows).exec()
          .then(inserted => {
            console.log("Inserted...", inserted.length, 'issues for ', project.org, project.repo);
            return inserted
          })
        }
      })
    }
    let url = 'https://api.github.com'
    url += `/repos/${project.org}/${project.repo}/issues`
    url += '?sort=updated'

    return this.db.select(lf.fn.max(issuesTable.updated_at)).from(issuesTable)
    .where(issuesTable.project_id.eq(project.id)).exec().then(result => {
      let since = result[0]['MAX(updated_at)']
      if (!since) {
        // This happens when the project doesn't have any issues, or
        // we've never downloaded issues for it before.
        if (this.projectsUpdatedAt[project.id]) {
          since = this.projectsUpdatedAt[project.id]
        }
      }
      if (since) {
        let copiedSince = new Date(since)
        // GitHub uses the since= as >= meaning that it will always return
        // something. Increment it by 1 second.
        copiedSince.setSeconds(copiedSince.getSeconds() + 1)
        copiedSince = copiedSince.toISOString()
        url += url.indexOf('?') > -1 ? '&' : '?'
        url += `since=${copiedSince}`
      }
      console.log("Downloading issues from:", url);
      return downloadIssues(url).then(() => {
        this.projectsUpdatedAt[project.id] = new Date()
      })
    })
  }

  selectStatus(status) {
    if (status == 'all') {
      this.setState({selectedStatuses: []}, this.loadIssues)
    } else {
      this.setState({selectedStatuses: [status]}, this.loadIssues)
    }
  }

  addProject(project) {
    if (!this.state.projects.find(p => p.id === project.id)) {
      let projects = this.state.projects
      projects.push(project)
      this.setState({projects: projects})

      // save it persistently too
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
          // if (!this.state.issues.length) {
          this.recountStatuses()
          this.loadIssues()
          // }
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

    let projectsTable = this.db.getSchema().table('Project')
    return this.db.delete()
    .from(projectsTable)
    .where(projectsTable.id.eq(project.id)).exec().then(() => {
      this.setState(stateChange, () => {
        this.recountStatuses()
        this.loadIssues()
      })
    })
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

    // Delay the refresh issue slightly in case the user decides she
    // clicked on the wrong one.
    if (this.refreshIssueTimer) {
      window.clearTimeout(this.refreshIssueTimer)
    }
    this.refreshIssueTimer = window.setTimeout(() => {
      this.refreshIssue(issue)
    }, 1000)
  }

  readComments(issue) {
    // console.log('HERE in readComments', issue.title);
    let comments = []
    let table = this.db.getSchema().table('Comment')

    // let countQuery = this.db.select(lf.fn.count(table.id))
    // .from(table)
    // .where(table.issue_id.eq(issue.id))

    let query = this.db.select().from(table)
    .where(table.issue_id.eq(issue.id))

    // countQuery.exec().then(result => {
    //   let count = result[0]['COUNT(id)']
    //   console.log('# comments', count);
    // })

    return query.orderBy(table.created_at, lf.Order.ASC).exec().then(results => {
      // console.log('RESULTS', results);
      let comments = results.map(result => {
        return result
      })
      this.setState({
        comments: comments,
        loadingMoreComments: false,
      })
    })

  }

  updateIssueCommentsByLoaded() {
    // Similar to updateIssueComments() but run it for all issues loaded
    // but only those who have no (last_actor & extract) but supposedly
    // has comments.
    let inserts = 0
    this.state.issues.map(issue => {
      if (issue.comments && (!issue.last_actor || !issue.extract)) {
        this.updateIssueComments(issue).then(inserted => {
          console.log('Updated issue comments for ', issue.title, inserted, 'comments');
          if (inserted) {
            inserted += inserted.length
          }
        })
      }
    })
    if (inserts) {
      // New comments have been inserted, that means the sort order might
      // have been changed.
      this.loadIssues()
    }
  }

  updateIssueComments(issue) {
    let commentsTable = this.db.getSchema().table('Comment')

    let maxDeepFetches = 20
    let deepFetches = 0
    const downloadComments = (url) => {
      return fetch(url)
      .then(this.fetchResponseProxy)
      .then(r => {
        if (r.headers.get('Link') && deepFetches >= maxDeepFetches) {
          console.warn(
            'NOTE! Downloaded ' + maxDeepFetches + 'pages but could go on'
          )
        }
        if (r.headers.get('Link') && deepFetches < maxDeepFetches) {
          let parsedLink = parse(r.headers.get('Link'))
          if (parsedLink.next) {
            deepFetches++
            downloadComments(parsedLink.next.url)
          }
        }
        if (r.status === 200) {
          return r.json()
        }
      })
      .then(comments => {
        if (comments) {
          // let commentsTable = this.db.getSchema().table('Comment')
          let wrapped = comments.map(comment => {
            return {
              id: comment.id,
              created_at: new Date(comment.created_at),
              updated_at: new Date(comment.updated_at),
              metadata: comment,
              _html: generateMarkdownHtml(comment.body),
              issue_id: issue.id,
              project_id: issue.project.id,
            }
          })

          let rows = wrapped.map(c => commentsTable.createRow(c))
          return this.db.insertOrReplace().into(commentsTable).values(rows).exec()
          .then(inserted => {
            console.log('Inserted... #', inserted.length, 'comments');
            if (inserted.length) {
              this.updateIssueLastComment(inserted[inserted.length - 1])
            }
            if (this.state.issue && this.state.issue.id === issue.id) {
              // this is the current open issue, update the comments state
              this.readComments(issue)
            }
            return inserted
          })
        }
      })
    }
    let url = 'https://api.github.com/'
    url += `repos/${issue.project.org}/${issue.project.repo}/issues/`
    url += `${issue.metadata.number}/comments`

    // There's no point downloading comments we have already downloaded,
    // so find out what the max updated_at date is and set that as a
    // ?since=:since query string.
    return this.db.select(lf.fn.max(commentsTable.updated_at)).from(commentsTable)
    .where(commentsTable.issue_id.eq(issue.id)).exec().then(result => {
      let since = result[0]['MAX(updated_at)']
      if (!since) {
        // This happens when the issue doesn't have any comments. So,
        // instead we maintain our own little memory of when we did this
        if (this.issueCommentsUpdatedAt[issue.id]) {
          since = this.issueCommentsUpdatedAt[issue.id]
        }
      }
      if (since) {
        // GitHub uses the since= as >= meaning that it will always return
        // something. Increment it by 1 second.
        since.setSeconds(since.getSeconds() + 1);
        since = since.toISOString()
        url += url.indexOf('?') > -1 ? '&' : '?'
        url += `since=${since}`
      }
      // XXX The browser and the GitHub API is smart with Etags etc
      // but we might want to consider NOT triggering a comments
      // download if we just did it a couple of seconds ago.
      console.log("Downloading comments from:", url);
      return downloadComments(url).then(() => {
        // remember that we started this download
        this.issueCommentsUpdatedAt[issue.id] = new Date()
      })
    })
  }

  updateIssueLastComment(comment) {
    let issuesTable = this.db.getSchema().table('Issue')
    let projectsTable = this.db.getSchema().table('Project')
    this.db.select().from(issuesTable)
    .innerJoin(projectsTable, issuesTable.project_id.eq(projectsTable.id))
    .where(issuesTable.id.eq(comment.issue_id)).exec().then(results => {
      let issue = results[0].Issue
      issue.project = results[0].Project
      issue.extract = generateMarkdownHtml(makeExtract(comment.metadata.body))
      issue.last_actor = comment.metadata.user
      let row = issuesTable.createRow(issue)
      this.db.insertOrReplace().into(issuesTable).values([row]).exec()
      .then(updated => {
        this.overrideIssueInLoadedIssues(issue)
      })
    })
  }

  overrideIssueInLoadedIssues(issue) {
    let found = false
    let issues = this.state.issues.map(i => {
      if (i.id === issue.id) {
        found = true
        // swap this one out
        return issue
      } else {
        return i
      }
    })
    if (found) {
      this.setState({issues: issues})
    }
  }

  refreshIssue(issue) {
    // reload the individual issue and update issue's comments
    let url = 'https://api.github.com/'
    url += `repos/${issue.project.org}/${issue.project.repo}/issues/`
    url += `${issue.metadata.number}`

    return fetch(url)
    .then(this.fetchResponseProxy)
    // .then(r => r.json())
    .then(r => {
      if (r.status === 200) {
        return r.json()
      } else {
        throw new Error(
          `Failed to download ${url} (status code: ${r.status})`
        )
      }
    })
    .then(response => {
      if (response) {
        let issuesTable = this.db.getSchema().table('Issue')
        let row = this._createIssueRow(issuesTable, {
          id: issue.id,
          state: response.state,
          title: response.title,
          _html: generateMarkdownHtml(response.body),
          updated_at: new Date(response.updated_at),
          comments: response.comments,
          extract: issue.extract,
          last_actor: issue.last_actor,
          metadata: response,
          new: false,
          project_id: issue.project_id,
        })
        return this.db.insertOrReplace().into(issuesTable).values([row]).exec()
        .then(inserted => {
          let insertedIssue = inserted[0]
          insertedIssue.project = issue.project
          this.overrideIssueInLoadedIssues(insertedIssue)
          return this.updateIssueComments(issue)
        })
        if (this.state.issue && this.state.issue.id === response.id) {
          // this is the current open issue, update state.
          this.setState({issue: issueWrapped})
        }
      } else {
        return new Promise((resolve, reject) => {
          reject('No response')
        })
      }
    })
    .catch(err => {
      console.error('refreshIssue error', err);
    })
  }

  _createIssueRow(table, issue) {
    if (!issue.id) {
      console.warn(issue);
      throw new Error('issue lacks an ID')
    }
    if (!issue.state) {
      console.warn(issue);
      throw new Error('issue lacks a state')
    }
    if (!issue.project_id) {
      console.warn(issue);
      throw new Error('issue lacks a project ID')
    }
    if (typeof issue.updated_at !== 'object') {
      console.warn(issue);
      throw new Error('issue.updated_at must be an object')
    }
    if (typeof issue._html === 'undefined') {
      console.warn(issue);
      throw new Error('issue._html should be set before creating row')
    }
    return table.createRow(issue)
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
    console.log('Search Changed:', search);
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

  statusesSelected(statuses) {
    this.setState({
      selectedStatuses: statuses,
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
          selectedStatuses={this.state.selectedStatuses}
          search={this.state.search}
          issueClicked={i => this.issueClicked(i)}
          activeIssue={this.state.issue}
          issues={this.state.issues}
          increaseSlice={() => this.increaseSlice()}
          searchChanged={search => this.searchChanged(search)}
          projectsSelected={projects => this.projectsSelected(projects)}
          statusesSelected={statuses => this.statusesSelected(statuses)}
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
