import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/monokai.css'

import CodeMirror from 'codemirror'
import 'codemirror/mode/javascript/javascript'
import prettier from 'prettier/standalone'
import babylon from 'prettier/parser-babylon'

import * as meshes from '../meshes'
import './index.sass'

const prettify = s => {
  try {
    return prettier.format(s, { parser: 'json', plugins: [babylon] })
  } catch (e) {
    console.error(e)
    return s
  }
}

class Edit {
  constructor() {
    this.editorWrapper = document.getElementById('editor')
    this.select = document.getElementById('mesh-select')
    this.reinit()
    this.meshes = JSON.parse(localStorage.getItem('meshes'))
    Object.keys(this.meshes).forEach(mesh => {
      const option = document.createElement('option')
      option.value = mesh
      option.innerHTML = mesh
      this.select.appendChild(option)
    })

    if (location.hash) {
      this.mesh = this.select.value = location.hash.slice(1)
    } else {
      this.mesh = this.select.value
    }
    const value = prettify(JSON.stringify(this.meshes[this.mesh]))
    this.cm = CodeMirror(this.editorWrapper, {
      mode: 'application/json',
      theme: 'monokai',
    })
    this.cm.setValue(value)
    window.addEventListener('storage', this.onStorage.bind(this))
    this.select.addEventListener('change', this.onSelect.bind(this), true)
    this.cm.on('changes', this.onJSON.bind(this))
    // this.textarea.addEventListener('input', this.onTextarea.bind(this), true)
  }

  reinit() {
    if (!localStorage.getItem('meshes')) {
      localStorage.setItem('meshes', prettify(JSON.stringify(meshes)))
    }
  }

  onSelect({ target: { value } }) {
    this.mesh = value

    this.cm.setValue(prettify(JSON.stringify(this.meshes[this.mesh])))
  }

  onJSON() {
    const value = prettify(this.cm.getValue())
    // this.cm.setValue(value)
    let newMesh
    try {
      newMesh = JSON.parse(value)
    } catch (e) {
      console.error(e)
      // this.textarea.style.outlineColor = 'red'
      return
    }
    // this.textarea.style.outlineColor = ''
    this.meshes[this.mesh] = newMesh
    localStorage.setItem('meshes', prettify(JSON.stringify(this.meshes)))
  }

  onStorage({ key }) {
    if (key !== 'meshes') {
      return
    }
    this.reinit()
    this.meshes = JSON.parse(localStorage.getItem('meshes'))

    this.cm.setValue(prettify(JSON.stringify(this.meshes[this.mesh])))
  }
}

window.anakataEdit = new Edit()
