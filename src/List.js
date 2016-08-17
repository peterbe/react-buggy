import React, { Component, PropTypes } from 'react';
import { ShowProject, RenderMarkdown, RenderHighlight } from './Common'
import { SLICE_START, SLICE_INCREMENT } from './Constants'
import { tokenizer, stemmer, trimmer } from 'elasticlunr'

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
    this.resetSearch = this.resetSearch.bind(this)
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
      // console.log('Searching for...:', this.refs.search.value.trim());
      let search = this.refs.search.value.trim()
      this.props.searchChanged(search)
      // this.setState({search: search})
      // this.loadIssues()
    }, 700)
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

  resetSearch(event) {
    event.preventDefault()
    this.clearSearch()
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

    let { canLoadMore, issues, loadingMore, search } = this.props
    let searchTerms = null
    if (search && search.length > 1) {
      searchTerms = [search]
      tokenizer(search).forEach(token => {
        token = trimmer(token)
        if (searchTerms.indexOf(token) === -1) {
          searchTerms.push(token)
        }
        token = stemmer(token)
        if (searchTerms.indexOf(token) === -1) {
          searchTerms.push(token)
        }
      })
    }
    let filteredTooMuch = null
    if (!issues.length) {
      filteredTooMuch = (
        <div className="email-item">
          <p>Filtered too much?</p>
          { search.length ?
          <p>Matching only: <code>{search}</code>.
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
                issue={issue}
                searchTerms={searchTerms}
                />
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




const Issue = ({ issue, issueClicked, active, searchTerms }) => {
  let issueAvatarURL = issue.metadata.user.avatar_url
  let className = 'email-item pure-g'
  if (active) {
    className += ' email-item-active'
  }
  if (issue.new) {
    className += ' email-item-unread'
  }
  let extract = issue.extract
  if (!extract) {
    extract = issue.metadata.body
  }
  let title = issue.title
  if (searchTerms) {
    title = <RenderHighlight
      text={issue.title}
      terms={searchTerms}/>
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
          {title}
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
