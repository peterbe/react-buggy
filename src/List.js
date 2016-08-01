import React, { Component, PropTypes } from 'react';
import { ShowProject, RenderMarkdown } from './Common'


function escapeRegExp(string){
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

const SLICE_START = 5
const SLICE_INCREMENT = 5


export default class List extends Component {
  static propTypes = {
    projectsAll: PropTypes.array.isRequired,
    issueClicked: PropTypes.func.isRequired,
    activeIssue: PropTypes.object,
    db: PropTypes.object,
    // lunrindex: PropTypes.object,
  }

  constructor(props) {
    super(props)

    this.state = {
      selectedProjects: [],
      showProjects: false,
      issues: [],
      search: '',
      // offsets: {},
      slice: SLICE_START,
      loadingMore: false,
      canLoadMore: false,
      // activeIssue: null,
    }

    this.handleListScroll = this.handleListScroll.bind(this)
  }

  componentDidMount() {
    console.log('List mounted!');

    this.loadIssues()

    // XXX call this.updateLunr()??
    // let offsets = this.state.offsets
    // let offsetsKey = ''
    // if (this.state.selectedProjects.length) {
    //   offsetsKey = this.state.selectedProjects.map(p => p.id).join('.')
    // }
    // offsetsKey += 'search:' + this.state.search
    //
    // console.log('OFFSETS', offsets);
    // console.log('OFFSETSKEY', offsetsKey);
    // // let offset = this.state.offsets

  }

  loadIssues() {
    let dbPromise = this.props.db.issues

    if (this.state.selectedProjects.length) {
      console.log(this.state.selectedProjects);
      // console.log('dbPromise',dbPromise);
      dbPromise = dbPromise.where('project_id').anyOf(
        this.state.selectedProjects.map(p => p.id)
      )
    }

    // dbPromise.count().then(count => {
    //   console.log('Count', count);
    //   this.setState({canLoadMore: count > this.state.slice})
    // })

    dbPromise
    .reverse()
    .sortBy('updated_at_ts')
    .then(issues => {
      this.setState({issues: issues})
    })
    // .orderBy('updated_at_ts').reverse()

  }

  handleListScroll(event) {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle)
    }
    this.scrollThrottle = setTimeout(() => {
      let rect = document.querySelector('#list-items').getBoundingClientRect()
      let height = document.querySelector('#list-items').innerHeight
      let nearBottom = (rect.bottom - 200) <= innerHeight
      if (nearBottom && this.state.canLoadMore) {
        this.increaseSlice()
      }
    }, 200)
  }

  updateLunr() {
    let t0=performance.now()
    this.lunrindex = elasticlunr(function() {
      this.addField('title')
      this.addField('body')
      this.addField('type')
      this.addField('issue_id')
      this.addField('project_id')
      this.setRef('id')
      // not store the original JSON document to reduce the index size
      this.saveDocument(false)
    })

    this.state.issuesAll.forEach(issue => {
      this.lunrindex.addDoc({
        id: issue.id,
        title: issue.title,
        body: issue.metadata.body,
        type: 'ISSUE',
        issue_id: issue.id,
        project_id: issue.project.id
      })
    })
    let t1=performance.now()
    console.log('THAT TOOK ' + (t1 - t0)/ 1000);
    // console.log('READ', issues.length, 'issues');
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

  selectProject(event, project) {
    event.preventDefault()
    if (project === 'ALL') {
      this.setState({selectedProjects: []})
    } else {
      let selected = this.state.selectedProjects
      // push or filter?
      if (selected.find(p => p.id === project.id)) {
        selected = selected.filter(p => p.id !== project.id)
      } else {
        selected.push(project)
      }
      this.setState({selectedProjects: selected, showProjects: false})
      this.loadIssues()
    }
  }

  toggleShowProjects() {
    this.setState({showProjects: !this.state.showProjects})
  }

  clearSearch() {
    this.refs.search.value = ''
    this.setState({search: ''})
    this.loadIssues()
    // this.props.refreshFiltering()
  }

  search() {
    // throttle this change
    if (this.searchThrottleTimer) {
      clearTimeout(this.searchThrottleTimer)
    }
    this.searchThrottleTimer = setTimeout(() => {
      console.log('Searching for...:', this.refs.search.value.trim());
      this.setState({search: this.refs.search.value.trim()})
      this.loadIssues()
    }, 500)
  }

  submitSearchForm(event) {
    event.preventDefault()
  }

  increaseSlice() {
    this.setState({slice: this.state.slice + SLICE_INCREMENT})
    this.loadIssues()
  }

  clickLoadMore(event) {
    event.preventDefault()
    this.increaseSlice()
  }

  issueClicked(issue) {
    // this.setState({activeIssue: issue})
    this.props.issueClicked(issue)
  }

  render() {
    let totalCount = this.props.projectsAll.reduce((agg, p) => agg + p.count, 0)
    let allClassName = this.state.selectedProjects.length ? '' : 'selected'

    let formButton = null
    if (this.state.search) {
      formButton = (
        <button
          className="pure-button secondary-button"
          onClick={(event) => this.clearSearch()}
          type="button"
          >Clear</button>
      )
    } else {
      let filterClassName = 'pure-button button-small'
      if (this.state.selectedProjects.length) {
        filterClassName += ' has-filters'
      }
      formButton = (
        <button
          className={filterClassName}
          type="button" title="Filter by Project"
           onClick={(event) => this.toggleShowProjects()}
          >
            { !this.state.showProjects ?
              <i className="fa fa-filter" aria-hidden="true"></i> :
              <i className="fa fa-close" aria-hidden="true"></i>
             }
            {' '}
            { this.state.showProjects ? 'Close' : 'Filter' }
            {' '}
            {
              this.state.selectedProjects.length ?
              <span>({this.state.selectedProjects.length})</span> : null
            }
        </button>
      )
    }

    let productFilters = null
    if (this.state.showProjects) {
      productFilters = (
        <div id="product-filters">
          <ul>
            <li className={allClassName}>
              <a href="#" onClick={(e) => this.selectProject(e, 'ALL')}>ALL ({totalCount})</a>
            </li>
            {
              this.props.projectsAll.map(project => {
                let className = ''
                if (this.state.selectedProjects.find(p => p.id === project.id)) {
                  className = 'selected'
                }
                return (
                  <li className={className} key={project.id}>
                    <a href="#"
                      onClick={(e) => this.selectProject(e, project)}
                      >{project.org} / {project.repo} ({project.count})</a>
                  </li>
                )
              })
            }
          </ul>
        </div>
      )
    }

    // let searchRegex = null
    // if (this.state.search) {
    //   // searchRegex = new RegExp(escapeRegExp(this.state.search), 'i')
    //   if (this.props.lunrindex) {
    //     let searchResults = this.props.lunrindex.search(this.state.search)
    //     console.log(searchResults);
    //     let refs = searchResults.map(result => parseInt(result.ref))
    //     // let refs = searchResults.map(result => result.ref)
    //     console.log('REFS', refs);
    //     this.props.db.issues.where('id').anyOf(refs).toArray().then(issues => {
    //       console.log('FOUND', issues);
    //     })
    //   }
    // }
    // let issues = this.props.issues.filter(issue => {
    //   // XXX need to depend on active statuses
    //
    //   if (this.state.selectedProjects.length) {
    //     if (!this.state.selectedProjects.find(p => p.id === issue.project.id)) {
    //       return false
    //     }
    //   }
    //   // if (searchRegex) {
    //   //   if (issue.title.search(searchRegex) < 0) {
    //   //     return false
    //   //   }
    //   // }
    //   return issue
    // })

    // let slicedIssues = issues.slice(0, this.state.slice)
    // let canLoadMore = this.state.slice < issues.length
    let canLoadMore = this.state.canLoadMore

    return (
      <div className="pure-u-1" id="list" onScroll={this.handleListScroll}>
        <div id="list-options">
          <form className="pure-form" id="searchform"
            onSubmit={(event) => this.submitSearchForm(event)}>
            <input
              type="text"
              ref="search"
              className="pure-input-rounded"
              onChange={(event) => this.search(event)}
              placeholder="Search..." />
            {' '}
            {formButton}
          </form>
        </div>{/* /list-options */}

        {productFilters}

        <div id="list-items">
          {
            this.state.issues.map(issue => {
              return <Issue
                key={issue.id}
                active={this.props.activeIssue && this.props.activeIssue.id === issue.id}
                issueClicked={(i) => this.issueClicked(i)}
                issue={issue}/>
            })
          }
          <div className="email-item">
            <p>Filtered too much?</p>
            <p>Matching only: <code>search</code>.
              <a href="#">Reset</a>
            </p>
            <p>
              You've filtered by: <br/> <b>*projects</b>.
              <a href="#">Reset</a>
            </p>
            <p>
              Only showing: <br/> <b>*status*</b>.
              <a href="#">Reset</a>
            </p>
          </div>{/* /email-item */}

          { canLoadMore ?
            <div className="email-item">
              <p>
                Limited to the {this.state.slice} most recently changed.<br/>
                <a href="#" onClick={e => this.clickLoadMore(e)}>Load more</a>
              </p>
            </div> : null
          }

        </div>
      </div>
   );
  }
}


const Issue = ({ issue, issueClicked, active }) => {
  let issueAvatarURL = issue.metadata.user.avatar_url
  let className = 'email-item pure-g'
  if (active) {
    className += ' email-item-active'
  }
  return (
    <div
      className={className}
      onClick={(event) => issueClicked(issue)}>
      <div className="pure-u">
        {/* Only do this if we have an email address */}
        <img
          src={issueAvatarURL}
          height="32" width="32"
          className="email-avatar"
          alt="avatar"
          title="Person who created the Issue/Pull Request"/>
        <br/>
        <br/>
        { issue.comments ?
          <span
            style={{marginLeft: 10}}
            className="badge badge-small"
            title="Number of comments">{issue.comments}</span> : null
        }

      </div>
      <div className="pure-u-5-6">
        <h5>
          <span className={`badge badge-small badge-${issue.state}`}>{issue.state}</span>
          <ShowProject project={issue.project}/>
          {' '}
          <a
            href={issue.metadata.html_url}
            target="_blank">#{issue.metadata.number}</a>
        </h5>
        <h4 className="email-subject">
          {
            issue.project.private ?
            <img
              className="padlock"
              src="static/images/padlock.png"
              alt="Padlock"
              title="Only visible to people who are cool"/> : null
          }
          <span>{issue.title}</span>
          <br/><small>{issue.updated_at_ts}</small>
        </h4>

        <p className="email-desc">
          {
            issue.last_actor ?
            <img
              src={issue.last_actor.avatar_url}
              className="email-avatar"
              alt="Avatar"
              title="Last person to comment"
              height="32" width="32" /> : null

          }
        </p>
        <div className="extract">
          <RenderMarkdown text={issue.extract}/>
        </div>

      </div>
      { !active ? <span className="bottom"></span> : null }

    </div>
  )
}
