import React, { Component, PropTypes } from 'react';


function escapeRegExp(string){
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}


export default class List extends Component {
  static propTypes = {
    projects: PropTypes.array.isRequired,
    issues: PropTypes.array.isRequired,
    issueClicked: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      selectedProjects: [],
      showProjects: false,
      search: '',
    }
  }

  // componentDidMount() {
  //   this.interval = setInterval(this.tick.bind(this), 1000);
  // }

  // tick() {
  //   this.setState({
  //     counter: this.state.counter + 1
  //   });
  // }
  //
  // componentWillUnmount() {
  //   clearInterval(this.interval);
  // }

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

  // filterIssues(issues) {
  //   return issues.filter(issue => {
  //     // XXX need to depend on search, active projects, active statuses
  //     return issue
  //   })
  // }
  //
  // refreshFiltering() {
  //   this.setState({issuesFiltered: this.filterIssues(this.state.issuesAll)})
  // }

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
                      >{project.org}/{project.repo} ({project.count})</a>
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

    return (
      <div className="pure-u-1" id="list">
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
            issues.map(issue => {
              return <Issue
                key={issue.id}
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

          <div className="email-item">
            <p>
              Limited to the XXX most recently changed.<br/>
              <a href="#">Load more</a>
            </p>
          </div>{/* /email-item */}

        </div>
      </div>
   );
  }
}


const Issue = ({ issue, issueClicked }) => {
  // console.log(issue);
  let issueAvatarURL = issue.metadata.user.avatar_url
  return (
    <div
      className="email-item pure-g"
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
        <h5 className="email-name">
          {issue.project.org} / {issue.project.repo}
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
          <a
            href={issue.metadata.html_url}
            target="_blank">{issue.metadata.number}</a>
          {' '}
          <span>{issue.title}</span>
        </h4>

        <p className="email-desc">
          <img
            src="static/images/avatar.png"
            className="email-avatar"
            alt="Avatar"
            title="Last person to comment"
            height="32" width="32"/>
          <span>{issue.extract}</span>
          <br/>
          <span className={`badge badge-small badge-${issue.state}`}>{issue.state}</span>
        </p>
      </div>
    </div>
  )
}
