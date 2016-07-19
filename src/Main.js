import React, { Component } from 'react'
import 'whatwg-fetch'

export default class Main extends Component {
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

  removeProject(event, project) {
    event.preventDefault()
    console.warn('REMOVE', project);
  }

  // addProject(project) {
  //   this.props.addProject(project)
  // }

  render() {
    const { projects, addProject } = this.props
    // let content = <About/>
    // let content = <Nothing repos={[]}/>

    // let projects=[]
    let content = <Config
      removeProject={this.removeProject}
      addProject={(p) => addProject(p)}
      projects={projects}/>
    return (
      <div className="pure-u-1" id="main">
        {content}
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

const Nothing = ({ repos }) => {
  return (
    <div className="email-content">
      <div className="email-content-header pure-g">
        <div className="pure-u-1-2">
          <h2 className="email-content-title">Nothing selected</h2>
        </div>
      </div>

      { repos.length ?
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


class Config extends Component {

  constructor(props) {
    super(props);
    this.state = { searching: false, searchFailure: null };
  }

  onSubmit(event) {
    event.preventDefault();
    let org = this.refs.org.value.trim()
    let repo = this.refs.repo.value.trim()
    if (org && repo) {
      this.setState({searching: true})
      let url = `https://api.github.com/repos/${org}/${repo}`
      fetch(url)
      .then(r => {
        this.setState({searching: false})
        if (r.status === 200) {
          return r.json()
        } else {
          this.setState({searchFailure: "Project not found."})
        }
      })
      .then(response => {
        this.setState({searchFailure: null})
        this.props.addProject({
          org: response.organization.login,
          repo: response.name,
          count: response.open_issues_count,
        })
        this.refs.org.value = ''
        this.refs.repo.value = ''
      })
      .catch(err => {
        console.log(err)
        this.setState({searching: false})
      })
    }

  }

  render() {
    const { projects, removeProject } = this.props
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
                <th>Organization</th>
                <th>Repository</th>
                <th>Count</th>
                <th>{' '}</th>
              </tr>
            </thead>
            <tbody>
              {
                projects.map((project) => {
                  return (
                    <tr key={project.org+project.repo}>
                      <td>{project.org}</td>
                      <td>{project.repo}</td>
                      <td>{project.count}</td>
                      <td>
                        <a href="#" onClick={(event) => removeProject(event, project)}
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
                placeholder="Repository"
                ref="repo" />
              <button
                type="submit"
                className="pure-button pure-button-primary">Find</button>
            </fieldset>
          </form>
          { this.state.searching ? <p>Searcing...</p> : null }
          { this.state.searchFailure ? <p className="search-failure">{ this.state.searchFailure }</p> : null }
        </div>
      </div>
    )
  }

}
