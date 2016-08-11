import React, { Component, PropTypes } from 'react';
import { ShowProject, RenderMarkdown } from './Common'
import { SLICE_START, SLICE_INCREMENT } from './Constants'

function escapeRegExp(string){
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}


export default class List extends Component {
  static propTypes = {
    projectsAll: PropTypes.array.isRequired,
    search: PropTypes.string.isRequired,
    issueClicked: PropTypes.func.isRequired,
    activeIssue: PropTypes.object,
    issues: PropTypes.array.isRequired,
    increaseSlice: PropTypes.func.isRequired,
    searchChanged: PropTypes.func.isRequired,
    projectsSelected: PropTypes.func.isRequired,
    statusesSelected: PropTypes.func.isRequired,
    loadingMore: PropTypes.bool,
    canLoadMore: PropTypes.bool,
    selectedProjects: PropTypes.array.isRequired,
    selectedStatuses: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props)

    this.state = {
      showProjects: false,
    }

    this.handleListScroll = this.handleListScroll.bind(this)
    this.resetSelectedProjects = this.resetSelectedProjects.bind(this)
    this.resetSelectedStatuses = this.resetSelectedStatuses.bind(this)
  }

  handleListScroll(event) {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle)
    }
    this.scrollThrottle = setTimeout(() => {
      let rect = document.querySelector('#list-items').getBoundingClientRect()
      let height = document.querySelector('#list-items').innerHeight
      let nearBottom = (rect.bottom - 200) <= innerHeight
      if (nearBottom && this.props.canLoadMore) {
        this.props.increaseSlice()
      }
    }, 200)
  }

  // updateLunr() {
  //   let t0=performance.now()
  //   this.lunrindex = elasticlunr(function() {
  //     this.addField('title')
  //     this.addField('body')
  //     this.addField('type')
  //     this.addField('issue_id')
  //     this.addField('project_id')
  //     this.setRef('id')
  //     // not store the original JSON document to reduce the index size
  //     this.saveDocument(false)
  //   })
  //
  //   this.state.issuesAll.forEach(issue => {
  //     this.lunrindex.addDoc({
  //       id: issue.id,
  //       title: issue.title,
  //       body: issue.metadata.body,
  //       type: 'ISSUE',
  //       issue_id: issue.id,
  //       project_id: issue.project.id
  //     })
  //   })
  //   let t1=performance.now()
  //   console.log('THAT TOOK ' + (t1 - t0)/ 1000);
  //   // console.log('READ', issues.length, 'issues');
  // }


  selectProject(event, project) {
    event.preventDefault()
    if (project === 'ALL') {
      this.props.projectsSelected([])
    } else {
      let selected = this.props.selectedProjects
      // push or filter?
      if (selected.find(p => p.id === project.id)) {
        selected = selected.filter(p => p.id !== project.id)
      } else {
        selected.push(project)
      }
      this.props.projectsSelected(selected)
      // this.setState({selectedProjects: selected, showProjects: false})

      // this.loadIssues()
    }
    this.setState({showProjects: false})
  }

  toggleShowProjects() {
    this.setState({showProjects: !this.state.showProjects})
  }

  clearSearch() {
    this.refs.search.value = ''
    this.props.searchChanged('')
    // this.loadIssues()
    // this.props.refreshFiltering()
  }

  search() {
    // XXX consider this kinda throttle https://www.sitepoint.com/throttle-scroll-events/
    // throttle this change
    if (this.searchThrottleTimer) {
      clearTimeout(this.searchThrottleTimer)
    }
    this.searchThrottleTimer = setTimeout(() => {
      console.log('Searching for...:', this.refs.search.value.trim());
      let search = this.refs.search.value.trim()
      this.props.searchChanged(search)
      // this.setState({search: search})
      // this.loadIssues()
    }, 500)
  }

  submitSearchForm(event) {
    event.preventDefault()
    // XXX ignoring timers, should this send the final value to
    // this.props.searchChanged()??
  }

  clickLoadMore(event) {
    event.preventDefault()
    this.props.increaseSlice()
  }

  issueClicked(issue) {
    // this.setState({activeIssue: issue})
    if (this.state.showProjects) {
      this.setState({showProjects: false})
    }
    this.props.issueClicked(issue)
    window.sessionStorage.setItem('activeissue', issue.id)
  }

  resetSelectedProjects(event) {
    event.preventDefault()
    this.props.projectsSelected([])
  }

  resetSelectedStatuses(event) {
    event.preventDefault()
    this.props.statusesSelected([])
  }

  render() {
    let totalCount = this.props.projectsAll.reduce((agg, p) => agg + p.count, 0)
    let allClassName = this.props.selectedProjects.length ? '' : 'selected'

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
      if (this.props.selectedProjects.length) {
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
              this.props.selectedProjects.length ?
              <span>({this.props.selectedProjects.length})</span> : null
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
                if (this.props.selectedProjects.find(p => p.id === project.id)) {
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
    // let canLoadMore = this.props.canLoadMore
    let { canLoadMore, issues, loadingMore } = this.props

    let filteredTooMuch = null
    if (!issues.length) {
      filteredTooMuch = (
        <div className="email-item">
          <p>Filtered too much?</p>
          { this.props.search.length ?
          <p>Matching only: <code>{this.props.search}</code>.
            <a href="#" onClick={this.resetSearch}>Reset search</a>
          </p> : null }
          { this.props.selectedProjects.length ?
          <p>
            You've filtered by: <br/>
            {
              this.props.selectedProjects.map(p => {
                return <b key={p.id}>{p.org}/{p.repo}{' '}</b>
              })
            }

            <a href="#" onClick={this.resetSelectedProjects}>Reset</a>
          </p> : null }
          { this.props.selectedStatuses.length ?
          <p>
            Only showing: <br/>
            {
              this.props.selectedStatuses.map(s => {
                return <b key={s}>{s}{' '}</b>
              })
            }
            <a href="#" onClick={this.resetSelectedStatuses}>Reset</a>
          </p> : null }
        </div>
      )
    }
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
            issues.map(issue => {
              return <Issue
                key={issue.id}
                active={this.props.activeIssue && this.props.activeIssue.id === issue.id}
                issueClicked={(i) => this.issueClicked(i)}
                issue={issue}/>
            })
          }
          {filteredTooMuch}

          { loadingMore ? <div className="email-item">
            <p className="loading">
              Loading more...
            </p>
          </div> : null}
          { canLoadMore && !loadingMore ?
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
  let extract = issue.extract
  if (!extract) {
    extract = issue.metadata.body
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
          <RenderMarkdown text={extract}/>
        </div>

      </div>
      { !active ? <span className="bottom"></span> : null }

    </div>
  )
}
