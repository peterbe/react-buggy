import React, { Component } from 'react';
// import marked from 'marked'
import showdown from 'showdown'


// Options from https://www.npmjs.com/package/showdown
const showdownConverter = new showdown.Converter({
  simplifiedAutoLink: true,
  noHeaderId: true,
  strikethrough: true,
  tasklists: true,
  tables: true,
  ghCodeBlocks: true,
})

export const generateMarkdownHtml = (text) => {
  return showdownConverter.makeHtml(text)
}

export const ShowProject = ({ project }) => {
  let orgURL = `https://github.com/${project.org}`
  let repoURL = orgURL + `/${project.repo}`
  return (
    <span className="project-name">
      <a href={orgURL} target="_blank" rel="noopener">{project.org}</a>
      <span>/</span>
      <a href={repoURL} target="_blank" rel="noopener">{project.repo}</a>
    </span>
  )
}

export const RenderMarkdown = ({ html }) => {
  if (typeof html === 'undefined') {
    throw new Error('html should not be undefined!')
  }
  html = html || ''  // it might be null
  let rendered = {__html: html}
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
