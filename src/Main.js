import React, { Component, PropTypes } from 'react'
import 'whatwg-fetch'
import moment from 'moment'
import parse from 'parse-link-header'
import { ShowProject, RenderMarkdown } from './Common'


export default class Main extends Component {
  static propTypes = {
    projects: PropTypes.array.isRequired,
    removeProject: PropTypes.func.isRequired,
    addProject: PropTypes.func.isRequired,
    fetchResponseProxy: PropTypes.func.isRequired,
    issue: PropTypes.object,
    comments: PropTypes.array,
    showConfig: PropTypes.bool,
    showAbout: PropTypes.bool,
  }
  constructor(props) {
    super(props);
    // this.state = { counter: 0 };
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

  // removeProject(event, project) {
  //   event.preventDefault()
  //   console.warn('REMOVE', project);
  // }

  // addProject(project) {
  //   this.props.addProject(project)
  // }

  render() {
    const {
      projects,
      addProject,
      removeProject,
      showConfig,
      showAbout,
      fetchResponseProxy,
     } = this.props
    // let content = <About/>
    // let content = <Nothing repos={[]}/>

    // let projects=[]
    let content
    if (showConfig) {
      content = <Config
        addProject={(p) => addProject(p)}
        removeProject={(p) => removeProject(p)}
        projects={projects}
        fetchResponseProxy={fetchResponseProxy}
        />
    } else if (showAbout) {
      content = <About/>
    } else if (this.props.issue) {
      content = <Issue
        issue={this.props.issue}
        comments={this.props.comments}
        />
    } else {
      content = <Nothing
        projects={projects}
        />
    }
    return (
      <div className="pure-u-1" id="main">
        <div id="top"></div>
        {content}
        <div id="bottom"></div>
      </div>
   );
  }
}


const About = () => {
  return (
    <div className="email-content">
      <div className="email-content-header pure-g">
        <div className="pure-u-1-2">
          <h2 className="email-content-title">About Buggy</h2>
        </div>
        <div className="pure-u-1-3">
          <p style={{textAlign: 'right'}}>
            <a href="#">Close</a>
          </p>
        </div>
      </div>
    </div>
  )
}

const Nothing = ({ projects }) => {
  return (
    <div className="email-content">
      <div className="email-content-header pure-g">
        <div className="pure-u-1-2">
          <h2 className="email-content-title">Nothing selected</h2>
        </div>
      </div>

      { projects.length ?
        <div className="email-content-body">
          <p>Select an issue in the left-hand column</p>
        </div>
        :
        <div className="email-content-body">
          <p><b>Welcome!</b></p>
          <p>
            To <b>get started</b> click "Config" in the nav bar and select the projects you want to watch.
          </p>
        </div>
      }
    </div>
  )
}


class Issue extends Component {
  static propTypes = {
    issue: PropTypes.object.isRequired,
    comments: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {
      showSticky: false,
      atTop: true,
      atBottom: false,
    }
    this.handleScroll = this.handleScroll.bind(this)
  }

  componentDidMount() {
    // Listen to scrolling
    // window.addEventListener('scroll', this.handleScroll)

    // Update the human readable "from time" in all datetime tags
    this.timeUpdater = setInterval(() => {
      [].slice.call(document.querySelectorAll('abbr.datetime')).forEach(e => {
        let textContent = moment(e.dataset.raw).fromNow()
        if (textContent !== e.textContent) {
          e.textContent = textContent
        }
      })
    }, 1000 * 60)
  }

  componentWillUnmount() {
    clearInterval(this.timeUpdater)
    // window.removeEventListener('scroll', this.handleScroll)
  }

  handleScroll(event) {
    if (this.scrollThrottle) {
      clearTimeout(this.scrollThrottle)
    }
    this.scrollThrottle = setTimeout(() => {
      let rect = document.querySelector('#main').getBoundingClientRect()
      let height = document.querySelector('#main').innerHeight
      let atTop = (rect.top + 50) >= 0
      let atBottom = (rect.bottom - 50) <= innerHeight
      this.setState({
        showSticky: rect.top < -100,
        atTop: atTop,
        atBottom: atBottom,
      })

    }, 500)
  }

  scrollTo(event, place) {
    event.preventDefault()
    if (place === 'top') {
      document.getElementById('top').scrollIntoView()
      this.setState({showSticky: false})
    } else {
      this.setState({showSticky: true})
      document.getElementById('bottom').scrollIntoView()
    }
  }

  render() {
    const { issue, comments } = this.props
    // console.log(issue);
    let scrolling = (
      <div className="scrolling">
        <p>
          { this.state.atBottom ? null : <a href="#bottom" onClick={e => scrollTo(e, 'bottom')}>&darr; Bottom</a> }
          { this.state.atTop ? null : <a href="#top" onClick={e => scrollTo(e, 'top')}>&uarr; Top</a> }
        </p>
      </div>
    )

    let sticky = null
    if (this.state.showSticky) {
      sticky = (
        <div className="sticky-summary">
          <h5>
            <a href={issue.metadata.html_url} target="_blank" className="external">{issue.metadata.number}</a>
            {' '}
            <ShowProject project={issue.project}/>
            {' '}
            <span className={`badge badge-small badge-${issue.state}`}>{issue.state}</span>
            <a href="#top" onClick={e => this.scrollTo(e, 'top')}>&uarr; Top</a>
          </h5>
          <h4>{issue.title}</h4>
        </div>
      )
    }

    let head = (
      <div className="pure-u-2-3">
        <h5><ShowProject project={issue.project}/></h5>
        <h2 className="email-content-title">{issue.title}</h2>
        <p className="external-url">
          <a href={issue.metadata.html_url} className="external"
             target="_blank">
             {issue.metadata.html_url}
          </a>
        </p>
      </div>
    )

    let controls = (
      <div className="pure-u-1-3 email-content-controls">
        <p>
          { issue.project.private ? <img src="static/images/padlock.png"
            alt="Padlock"
            title="Private repository" /> : null }
          <span className={`badge badge-bigger badge-${issue.state}`}>{issue.state}</span>
        </p>
        <button className="pure-button secondary-button">Refresh now</button>
      </div>
    )



    return (
      <div className="email-content">
        {scrolling}
        {sticky}

        <div className="email-content-header pure-g">
          {head}

          {controls}

          <div className="pure-u">
            <img
              className="email-avatar"
              alt="Avatar"
              height="32" width="32"
              src={issue.metadata.user.avatar_url}/>
          </div>

          <div className="pure-u-3-4">
            <p className="email-content-subtitle">
              By <User user={issue.metadata.user}/> at
              {' '}
              <Datetime date={issue.metadata.created_at}/>
              {' '}
              Last changed
              {' '}
              <Datetime date={issue.metadata.updated_at}/>
            </p>

            <Assignees assignees={issue.metadata.assignees}/>

            <Labels labels={issue.metadata.labels}/>

          </div>
        </div>

        <div className="email-content-body">
          <div className="pure-u-3-4">
            <ShowDescription body={issue.metadata.body} />

          </div>
        </div>

        {
          comments.map(comment => {
            return <Comment
                comment={comment.metadata}
                key={comment.id}
                />
          })
        }

        {
          !comments.length ?
          <p className="email-content-body">No comments</p> : null
         }

      </div>

    )
  }
}

const ShowDescription = ({ body }) => {
  if (body && body.length) {
    return <RenderMarkdown text={body}/>
  } else {
    return <i>No description provided.</i>
  }
}


const Comment = ({ comment }) => {
  return (
    <div className="email-content-body">
      <div className="pure-u">
        <img
          className="email-avatar" alt="Avatar" height="32" width="32"
          src={comment.user.avatar_url} />
      </div>
      <div className="pure-u-3-4">
        <p className="email-content-subtitle">
          By <User user={comment.user} /> at
          {' '}
          <a href={comment.html_url} target="_blank">
            <Datetime date={comment.created_at} />
          </a>
        </p>
        <RenderMarkdown text={comment.body}/>
      </div>

    </div>
  )
}

const Datetime = ({ date }) => {
  let d = moment(date)
  return <abbr
    data-raw={date}
    className="datetime"
    title={d.format('dddd, MMMM Do YYYY, h:mm:ss a zz')}
    >{d.fromNow()}</abbr>
}

const User = ({ user }) => {
  // XXX a lot more work can be done
  return <a href={user.html_url} className="username">{user.login}</a>
}


// http://stackoverflow.com/a/5624139
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const Labels = ({ labels }) => {
  if (!labels.length) {
    return null
  }

  return (
    <p className="email-content-subtitle">
      {
        labels.map(label => {
          let style = {backgroundColor: '#' + label.color}
          let rgb = hexToRgb(label.color)
          // https://24ways.org/2010/calculating-color-contrast/
          let yiq = ((rgb.r*299)+(rgb.g*587)+(rgb.b*114))/1000
          style.color = (yiq >= 128) ? '#303300' : '#ffffff'
          return <span
            key={label.url}
            className="badge"
            style={style}
            >{label.name}</span>
        })
      }

    </p>
  )
}

const Assignees = ({ assignees }) => {
  if (!assignees.length) {
    return null
  }
  return (
    <p className="email-content-subtitle">
      Assigned to {
        assignees.map((user) => {
          return <User user={user} key={user.id}/>
        })
      }
    </p>
  )
}


class Config extends Component {
  static propTypes = {
    projects: PropTypes.array.isRequired,
    removeProject: PropTypes.func.isRequired,
    addProject: PropTypes.func.isRequired,
    fetchResponseProxy: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props)
    this.state = {
      searching: false,
      searchFailure: null,
      foundRepos: [],
    }
    this.clickedFoundRepo = this.clickedFoundRepo.bind(this)
    this.closeFoundRepos = this.closeFoundRepos.bind(this)
  }

  _findUserRepos(owner) {
    let tasks = 2
    return new Promise((resolve, reject) => {
      let baseURL = 'https://api.github.com'

      // fetch by recent events
      let deepEventFetches = 0
      const fetchEventsByURL = (url) => {
        fetch(url)
        .then(this.props.fetchResponseProxy)
        .then(r => {
          if (r.status === 200) {
            if (r.headers.get('Link') && deepEventFetches < 10) {
              let parsedLink = parse(r.headers.get('Link'))
              if (parsedLink.next) {
                deepEventFetches++
                tasks++
                fetchEventsByURL(parsedLink.next.url)
              }
            }
            return r.json()
          } else {
            this.setState({
              searchFailure: `Lookup failed (${r.status}, ${r.statusText})`
            })
            reject()
          }
        })
        .then(response => {
          let existingProjectIds = this.props.projects.map(p => p.id)
          response.map(event => {
            if (!existingProjectIds.includes(event.repo.id)) {
              existingProjectIds.push(event.repo.id)
              this._findRepo(event.repo.name.split('/')[0], event.repo.name.split('/')[1]).then(repo => {
                if (repo) {
                  let found = this.state.foundRepos
                  if (!found.find(r => r.id === repo.id)) {
                    found.push(repo)
                    if (repo.fork && repo.parent) {
                      found.push(repo.parent)
                    }
                    this.setState({foundRepos: found})
                  }
                }
              })
            }
          })
          tasks--
          if (!tasks) {
            resolve()
          }
        })
        .catch(err => {
          console.error(err)
          reject(err)
        })
      }
      let url = baseURL + `/users/${owner}/events`
      fetchEventsByURL(url)

      // Fetch all the users repos
      let deepRepoFetches = 0
      const fetchReposByURL = (url) => {
        fetch(url)
        .then(this.props.fetchResponseProxy)
        .then(r => {
          if (r.status === 200) {
            if (r.headers.get('Link') && deepRepoFetches < 10) {
              let parsedLink = parse(r.headers.get('Link'))
              if (parsedLink.next) {
                deepEventFetches++
                tasks++
                fetchReposByURL(parsedLink.next.url)
              }
            }
            return r.json()
          } else {
            this.setState({
              searchFailure: `Lookup failed (${r.status}, ${r.statusText})`
            })
          }
        })
        .then(repos => {
          if (repos.length) {
            let found = this.state.foundRepos
            repos.forEach(repo => {
              found.push(repo)
              if (repo.fork && repo.parent) {
                found.push(repo.parent)
              }
            })
            this.setState({foundRepos: found})
          }
          tasks--
          if (!tasks) {
            resolve()
          }
        })
        .catch(err => {
          console.error(err)
          reject(err)
        })
      }
      url = baseURL + `/users/${owner}/repos?sort=pushed&type=all&direction=desc`
      fetchReposByURL(url)
      tasks--

    })
  }

  _findRepo(org, repo) {
    return new Promise((resolve, reject) => {
      let url = 'https://api.github.com'
      url += `/repos/${org}/${repo}`
      fetch(url)
      .then(this.props.fetchResponseProxy)
      .then(r => {
        if (r.status === 200) {
          return r.json()
        } else if (r.status === 404) {
          this.setState({
            searchFailure: "Project not found. If it's a private repo you need to generate an auth token"
          })
        } else {
          this.setState({
            searchFailure: `Lookup failed (${r.status}, ${r.statusText})`
          })
          reject()
        }
      })
      .then(response => {
        if (response) {
          this.setState({searchFailure: null})
          if (!(response.owner && response.owner.login)) {
            console.log(response);
            throw new Error(response)
          }
        }
        resolve(response)
      })
      .catch(err => {
        console.log(err)
        reject(err)
      })
    })
  }

  onSubmit(event) {
    event.preventDefault();
    let org = this.refs.org.value.trim()
    let repo = this.refs.repo.value.trim()
    this.setState({searching: true, foundRepos: []})
    if (org && repo) {
      this._findRepo(org, repo).then(repo => {
        if (repo) {
          // console.log('Repo*', repo);
          // console.log('LOGIN', repo.owner.login);
          this.props.addProject({
            id: repo.id,
            org: repo.owner.login,
            repo: repo.name,
            count: repo.open_issues_count,
            private: repo.private || false,
          })
          this.refs.repo.value = ''
        }
        this.setState({searching: false})
      })
      .catch(err => {
        this.setState({searching: false})
      })
    } else {
      this._findUserRepos(org).then(() => {
        this.setState({searching: false})
      })
      .catch(err => {
        this.setState({searching: false})
      })
    }

      //
      //     } else {
      //       // It's a list of activities
      //       let existingProjectIds = this.props.projects.map(p => p.id)
      //       response.map(event => {
      //         if (!existingProjectIds.includes(event.repo.id)) {
      //           existingProjectIds.push(event.repo.id)
      //           let repoURL = 'https://api.github.com'
      //           repoURL += '/repos/' + event.repo.name
      //           fetch(repoURL)
      //           .then(this.props.fetchResponseProxy)
      //           .then(r => {
      //             if (r.status === 200) {
      //               return r.json()
      //             }
      //           })
      //           .then(repository => {
      //             let found = this.state.foundRepos
      //             found.push(repository)
      //             console.log('FOUND', found);
      //             this.setState({foundRepos: found})
      //           })
      //         }
      //       })
      //     }
      //   }
      // })
      // .catch(err => {
      //   console.log(err)
      //   this.setState({searching: false})
      // })
    // }
  }

  clickedFoundRepo(event, repo) {
    event.preventDefault()
    this.props.addProject({
      id: repo.id,
      org: repo.owner.login,
      repo: repo.name,
      count: repo.open_issues_count,
      private: repo.private || false,
    })
    let found = this.state.foundRepos.filter(r => r.id !== repo.id)
    this.setState({foundRepos: found})
  }

  closeFoundRepos(event) {
    event.preventDefault()
    this.setState({foundRepos: []})
  }

  removeProject(event, project) {
    event.preventDefault()
    this.props.removeProject(project)
  }

  render() {
    const { projects } = this.props
    return (
      <div className="email-content">
        <div className="email-content-header pure-g">
          <div className="pure-u-1-2">
            <h2 className="email-content-title">Configuration Options</h2>
          </div>
          <div className="pure-u-1-3">
            <p style={{textAlign: 'right'}}>
              <a href="#">Close</a>
            </p>
          </div>
        </div>
        <div className="email-content-body">
          <table className="pure-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Count</th>
                <th>{' '}</th>
              </tr>
            </thead>
            <tbody>
              {
                projects.map((project) => {
                  return (
                    <tr key={project.org+project.repo}>
                      <td><ShowProject project={project}/></td>
                      <td>{project.count}</td>
                      <td>
                        <a href="#"
                          onClick={(event) => this.removeProject(event, project)}
                          title="Remove project"
                          >
                          <img src="static/images/trash.png" alt="Trash"/>
                        </a>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
          <form
            action=""
            className="pure-form"
            onSubmit={(event) => this.onSubmit(event)}>
            <fieldset>
              <legend>Add a new project</legend>
              <code>https://github.com/</code>
              <input
                type="text"
                name="org"
                placeholder="Organization/User"
                ref="org" />
              {'/'}
              <input
                type="text"
                name="repo"
                placeholder="Repository (optional)"
                ref="repo" />
              <button
                type="submit"
                className="pure-button pure-button-primary">Find</button>
            </fieldset>
          </form>
          { this.state.searching ? <p>Searcing...</p> : null }
          { this.state.searchFailure ? <p className="search-failure">{ this.state.searchFailure }</p> : null }

          <FoundRepos
            repos={this.state.foundRepos}
            clickedFoundRepo={this.clickedFoundRepo}
            closeFoundRepos={this.closeFoundRepos}
            />
        </div>
      </div>
    )
  }

}


const FoundRepos = ({ repos, clickedFoundRepo, closeFoundRepos }) => {
  if (!repos.length) {
    return null
  }
  return (
    <div>
      <table className="pure-table pure-table-horizontal">
        <thead>
          <tr>
            <th>Name</th>
            <th>Count</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
        {
          repos.map(repo => {
            // console.log('FOUND', repo)
            // console.log('Owner', repo.owner.login);
            return (
              <tr key={repo.id}>
                <td>
                  <a
                    href={repo.html_url}
                    title={repo.description}
                    target="_blank">
                    {repo.owner.login} / {repo.name}
                  </a>
                </td>
                <td>{repo.open_issues_count}</td>
                <td>
                  <button className="pure-button"
                    onClick={e => clickedFoundRepo(e, repo)}>
                    +
                  </button>
                </td>
              </tr>
            )
          })
        }
        </tbody>
      </table>
      <button
        onClick={e => closeFoundRepos(e)}
        type="button"
        className="pure-button pure-button-primary">Close</button>

    </div>
  )
}
