import React, { Component } from 'react';
import Layout from './Layout';
import Dialog from './Dialog';
import Nav from './Nav';
import List from './List';
import Main from './Main';
import APIDialog from './APIDialog';
import Dexie from 'dexie';
import { makeExtract } from './Utils';
import parse from 'parse-link-header'

// If you use React Router, make this component
// render <Router> with your routes. Currently,
// only synchronous routes are hot reloaded, and
// you will see a warning from <Router> on every reload.
// You can ignore this warning. For details, see:
// https://github.com/reactjs/react-router/issues/2182

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedStatuses: [],
      projects: [],
      fetching: null,
      issuesAll: [],
      issue: null,
      comments: [],
      showConfig: false,
      showAbout: false,
      ratelimitLimit: 60,
      ratelimitRemaining: 60,
    }
    this.selectStatus = this.selectStatus.bind(this)
    this.fetchResponseProxy = this.fetchResponseProxy.bind(this)
    this.readIssues = this.readIssues.bind(this)
  }

  componentDidMount() {
    this.db = new Dexie('buggy')
    this.db.version(1).stores({
      projects: 'id,org,repo,count',
      issues: 'id,project_id,project,state,title,comments,extract,last_actor,updated_at_ts',
      comments: 'id,project_id,issue_id,created_at_ts'
    })
    this.db.open().catch(error => {
      console.warn('Unable to open the IndexedDB database');
      console.error(error);
    })

    this.db.projects.toArray().then(results => {
      if (results.length) {
        this.setState({projects: results})
        for (var project of results) {
          this.downloadNewIssues(project)
        }
      }
    })

    this.readIssues()

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

  readIssues() {
    return this.db.issues.orderBy('updated_at_ts').reverse().toArray().then(issues => {
      this.setState({issuesAll: issues})
    })
  }

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
          let rewrapped = issues.map(issue => {
            return {
              id: issue.id,
              project_id: project.id,
              project: project,
              state: issue.state,
              title: issue.title,
              comments: issue.comments,
              extract: makeExtract(issue.body),
              last_actor: null,
              metadata: issue,
              updated_at_ts: (new Date(issue.updated_at)).getTime(),
            }
          })
          this.db.issues.bulkPut(rewrapped);
          // Need to download closed ones too
          // XXX need to recurse/paginate here
        }
      })
      .catch(err => {
        console.warn('Unable to download issues from ' + url);
        console.error(err);
      })
    }
    let url = 'https://api.github.com'
    url += `/repos/${project.org}/${project.repo}/issues`
    return downloadIssues(url)

  }

  componentWillUnmount() {
    if (this.db) {
      this.db.close()  // not sure if this is needed but feels good
    }
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
      this.db.projects.add(project)
      this.downloadNewIssues(project)
      .then(this.readIssues)
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
    stateChange.issuesAll = this.state.issuesAll.filter(i => {
      return i.project.id !== project.id
    })
    this.setState(stateChange)

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
    console.log('CLEAR!!');
    this.db.close()
    let r = indexedDB.deleteDatabase('buggy')
    r.onsuccess = () => {
      alert('All cleared')
      document.location.reload(1)
    }
    r.onblocked = () => {
      alert('DB blocked')
    }
    r.onerror = () => {
      alert("Couldn't delete database");
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
    return this.db.comments
    .where('issue_id')
    .equals(issue.id)
    .toArray()
    .then(comments => {
      if (comments.length) {
        let lastComment = comments[comments.length - 1]
        // console.log(lastComment);
        issue.extract = makeExtract(lastComment.metadata.body)
        issue.last_actor = lastComment.metadata.user
        this.db.issues.put(issue)
        this.setState({comments: comments})
      } else {
        this.setState({comments: []})
      }

    })

  }

  updateIssueComments(issue) {
    let url = 'https://api.github.com/'
    url += `repos/${issue.project.org}/${issue.project.repo}/issues/`
    url += `${issue.metadata.number}/comments`
    return fetch(url)
    .then(this.fetchResponseProxy)
    .then(r => r.json())
    .then(comments => {
      let rewrapped = comments.map(comment => {
        return {
          id: comment.id,
          issue_id: issue.id,
          project_id: issue.project.id,
          metadata: comment,
          created_at_ts: (new Date(comment.created_at)).getTime(),
        }
      })
      this.db.comments.bulkPut(rewrapped);
      // Needs to update the issue's "extract" and "latest_comment" (for avatar)
      // needs pagination
      if (this.state.issue && this.state.issue.id === issue.id) {
        // this is the current open issue, update the comments state
        this.readComments(issue)
      }
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
      let issueWrapped = {
        id: response.id,
        project: issue.project,
        state: response.state,
        title: response.title,
        comments: response.comments,
        extract: issue.extract,
        last_actor: issue.last_actor,
        metadata: response,
        updated_at_ts: (new Date(response.updated_at)).getTime(),
      }
      this.db.issues.put(issueWrapped)
      if (this.state.issue && this.state.issue.id === response.id) {
        // this is the current open issue, update state.
        this.setState({issue: issueWrapped})
      }
      // let's also update the list of all issues
      let issuesAll = this.state.issuesAll.map(i => {
        if (i.id === issueWrapped.id) {
          return issueWrapped
        } else {
          return i
        }
      })
      this.setState({issuesAll: issuesAll})
      return this.updateIssueComments(issue)
    })

  }

  toggleShowConfig() {
    this.setState({showConfig: !this.state.showConfig})
  }

  render() {
    return (
      <Layout>
        {/*<Dialog />*/}
        <APIDialog
          toggleShowConfig={()=> this.toggleShowConfig()}
          ratelimitLimit={this.state.ratelimitLimit}
          ratelimitRemaining={this.state.ratelimitRemaining}
          />
        <Nav
          issues={this.state.issuesAll}
          selectedStatuses={this.state.selectedStatuses}
          selectStatus={this.selectStatus}
          toggleShowConfig={()=> this.toggleShowConfig()}
          ratelimitLimit={this.state.ratelimitLimit}
          ratelimitRemaining={this.state.ratelimitRemaining}
          _clearAll={(e) => this._clearAll(e)}
          />
        <List
          projects={this.state.projects}
          issues={this.state.issuesAll}
          activeIssue={this.state.issue}
          issueClicked={i => this.issueClicked(i)}
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
    );
  }
}
