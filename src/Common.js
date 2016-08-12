import React, { Component } from 'react';
import marked from 'marked'


marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false,
});


export const ShowProject = ({ project }) => {
  let orgURL = `https://github.com/${project.org}`
  let repoURL = orgURL + `/${project.repo}`
  return (
    <span className="project-name">
      <a href={orgURL} target="_blank">{project.org}</a>
      <span>/</span>
      <a href={repoURL} target="_blank">{project.repo}</a>
    </span>
  )
}

export const RenderMarkdown = ({ text }) => {
  if (typeof text === 'undefined') {
    throw new Error('text should not be undefined!')
  }
  text = text || ''  // it might be null
  text = marked(text)
  let rendered = {__html: text}
  return <div className="markdown" dangerouslySetInnerHTML={rendered}></div>
}


function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
function highlightText(text, terms) {
  terms = terms.map(escapeRegExp);
  var re = new RegExp('\\b((' + terms.join('|') + ')[\\S\'`]*)', 'gi');
  return text.replace(re, '<b>$1</b>');
}

export const RenderHighlight = ({ text, terms }) => {
  text = text.replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')
  text = highlightText(text, terms)
  let rendered = {__html: text}
  return <span dangerouslySetInnerHTML={rendered}></span>

}
