import React, { Component, PropTypes } from 'react';
import { ShowProject, RenderMarkdown } from './Common'


function escapeRegExp(string){
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

const SLICE_START = 50
const SLICE_INCREMENT = 50


export default class List extends Component {
  static propTypes = {
    projects: PropTypes.array.isRequired,
    issues: PropTypes.array.isRequired,
    issueClicked: PropTypes.func.isRequired,
    activeIssue: PropTypes.object,
  }

  constructor(props) {
    super(props);
    this.state = {
      selectedProjects: [],
      showProjects: false,
      search: '',
      slice: SLICE_START,
      loadingMore: false,
    }

    this.handleListScroll = this.handleListScroll.bind(this)
  }

  handleListScroll(event) {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle)
    }
    this.scrollThrottle = setTimeout(() => {
      let rect = document.querySelector('#list-items').getBoundingClientRect()
      let height = document.querySelector('#list-items').innerHeight
      let nearBottom = (rect.bottom - 200) <= innerHeight
      if (nearBottom && this.state.slice < this.props.issues.length) {
        this.increaseSlice()
      }
    }, 200)
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
    }
  }

  toggleShowProjects() {
    this.setState({showProjects: !this.state.showProjects})
  }

  clearSearch() {
    this.refs.search.value = ''
    this.setState({search: ''})
    // this.props.refreshFiltering()
  }
  search() {
    // throttle this change
    this.setState({search: this.refs.search.value.trim()})
    // XXX Start a throttle that soon makes a filtering thing
    // this.props.refreshFiltering() // placeholder solution
  }

  submitSearchForm(event) {
    event.preventDefault()
  }

  increaseSlice() {
    this.setState({slice: this.state.slice + SLICE_INCREMENT})
  }

  clickLoadMore(event) {
    event.preventDefault()
    this.increaseSlice()
  }

  render() {
    let totalCount = this.props.projects.reduce((agg, p) => agg + p.count, 0)
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
      let filterClassName = 'pure-button secondary-button'
      if (this.state.selectedProjects.length) {
        filterClassName += ' has-filters'
      }
      formButton = (
        <button
          className={filterClassName}
          type="button" title="Filter by Project"
           onClick={(event) => this.toggleShowProjects()}
          >
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
              this.props.projects.map(project => {
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

    let searchRegex = null
    if (this.state.search) {
      searchRegex = new RegExp(escapeRegExp(this.state.search), 'i')
    }
    let issues = this.props.issues.filter(issue => {
      // XXX need to depend on active statuses

      if (this.state.selectedProjects.length) {
        if (!this.state.selectedProjects.find(p => p.id === issue.project.id)) {
          return false
        }
      }
      if (searchRegex) {
        if (issue.title.search(searchRegex) < 0) {
          return false
        }
      }
      return issue
    })


    let slicedIssues = issues.slice(0, this.state.slice)
    let canLoadMore = this.state.slice < issues.length

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
            {formButton}
          </form>
        </div>{/* /list-options */}

        {productFilters}

        <div id="list-items">
          {
            slicedIssues.map(issue => {
              return <Issue
                key={issue.id}
                active={this.props.activeIssue && this.props.activeIssue.id === issue.id}
                issueClicked={(i) => this.props.issueClicked(i)}
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
