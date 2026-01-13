const STORAGE_KEY = 'asp:rules'

function notice(ctx, msg, level = 'ok', ms = 2000) {
  try {
    ctx?.ui?.notice?.(String(msg || ''), level, ms)
  } catch {}
}

function getDefaultRules() {
  return [
    {
      extensions: ['zhixu'],
      displayName: '知序绘图',
      fileTree: { show: true, icon: 'file' },
      openWith: { mode: 'plugin', pluginId: 'zhixu-draw', method: 'open' },
    },
  ]
}

function normalizeExt(raw) {
  try {
    let ext = String(raw || '').trim().toLowerCase()
    if (ext.startsWith('.')) ext = ext.slice(1)
    ext = ext.replace(/\s+/g, '').replace(/[^a-z0-9+_-]/g, '')
    return ext
  } catch {
    return ''
  }
}

function sanitizeRule(raw) {
  if (!raw || typeof raw !== 'object') return null
  let extensions = raw.extensions
  if (!Array.isArray(extensions)) {
    const single = raw.ext || raw.extension
    extensions = single ? [single] : []
  }
  extensions = extensions.map(normalizeExt).filter(Boolean)
  if (!extensions.length) return null

  const displayName =
    typeof raw.displayName === 'string' ? raw.displayName : undefined

  const fileTree = (() => {
    const ft = raw.fileTree
    if (!ft || typeof ft !== 'object') return undefined
    return {
      show: typeof ft.show === 'boolean' ? ft.show : true,
      icon: ft.icon === 'pdf' ? 'pdf' : 'file',
    }
  })()

  const openWith = (() => {
    const ow = raw.openWith
    if (!ow || typeof ow !== 'object') return undefined
    if (ow.mode === 'plugin') {
      const pluginId = String(ow.pluginId || '').trim()
      if (!pluginId) return { mode: 'markdown' }
      const method = String(ow.method || '').trim()
      return method
        ? { mode: 'plugin', pluginId, method }
        : { mode: 'plugin', pluginId }
    }
    return { mode: 'markdown' }
  })()

  return {
    extensions,
    displayName,
    fileTree,
    openWith,
  }
}

async function loadRules(ctx) {
  try {
    const v = await ctx?.storage?.get?.(STORAGE_KEY)
    if (!Array.isArray(v)) return getDefaultRules()
    const list = v.map(sanitizeRule).filter(Boolean)
    return list.length ? list : getDefaultRules()
  } catch {
    return getDefaultRules()
  }
}

async function saveRules(ctx, rules) {
  try {
    await ctx?.storage?.set?.(STORAGE_KEY, rules)
  } catch {}
}

async function applyRules(ctx, rules) {
  const asp = ctx?.asp
  if (!asp || typeof asp.register !== 'function') return
  try {
    asp.unregisterAll?.()
  } catch {}
  for (const r of rules) {
    try {
      asp.register(r)
    } catch {}
  }
  try {
    const refresh = window?.flymdRefreshFileTree
    if (typeof refresh === 'function') await refresh()
  } catch {}
}

export async function activate(ctx) {
  const asp = ctx?.asp
  if (!asp || typeof asp.register !== 'function') {
    notice(ctx, '当前 flyMD 版本不支持 ASP（Additional Suffix Plugin）API，请升级 flyMD。', 'err', 3200)
    return
  }

  const rules = await loadRules(ctx)
  await saveRules(ctx, rules)
  await applyRules(ctx, rules)
}

export async function openSettings(ctx) {
  const asp = ctx?.asp
  if (!asp || typeof asp.register !== 'function') {
    notice(ctx, '当前 flyMD 版本不支持 ASP 设置（缺少 ctx.asp.register），请升级 flyMD。', 'err', 3200)
    return
  }

  const existing = document.getElementById('asp-settings-modal')
  try { existing?.parentElement?.removeChild(existing) } catch {}

  const mkBtn = (text, primary = false) => {
    const b = document.createElement('button')
    b.textContent = text
    b.style.border = '1px solid var(--border)'
    b.style.borderRadius = '8px'
    b.style.padding = '6px 12px'
    b.style.background = primary ? '#2563eb' : 'rgba(127,127,127,0.08)'
    b.style.color = primary ? '#fff' : 'var(--fg)'
    b.style.cursor = 'pointer'
    return b
  }

  const overlay = document.createElement('div')
  overlay.id = 'asp-settings-modal'
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'rgba(0,0,0,0.35)'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'
  overlay.style.zIndex = '99999'

  const box = document.createElement('div')
  box.style.width = 'min(980px, 94vw)'
  box.style.maxHeight = 'min(82vh, 780px)'
  box.style.background = 'var(--bg)'
  box.style.color = 'var(--fg)'
  box.style.border = '1px solid var(--border)'
  box.style.borderRadius = '12px'
  box.style.boxShadow = '0 12px 36px rgba(0,0,0,0.2)'
  box.style.display = 'flex'
  box.style.flexDirection = 'column'
  box.style.overflow = 'hidden'

  const header = document.createElement('div')
  header.style.padding = '12px 16px'
  header.style.fontWeight = '600'
  header.style.borderBottom = '1px solid var(--border)'
  header.textContent = 'ASP 后缀规则设置'

  const help = document.createElement('div')
  help.style.padding = '10px 16px'
  help.style.fontSize = '12px'
  help.style.opacity = '0.9'
  help.style.borderBottom = '1px solid var(--border)'
  help.innerHTML =
    '<div>在这里添加/编辑后缀规则：后缀将影响文件树展示与打开策略。</div>' +
    '<div style="margin-top:6px;opacity:0.85">多个后缀用逗号分隔（不需要写点号），例如 <code>png, jpg, jpeg</code>。</div>'

  const content = document.createElement('div')
  content.style.flex = '1'
  content.style.overflow = 'auto'
  content.style.padding = '12px'

  const grid = document.createElement('div')
  grid.style.display = 'grid'
  grid.style.gridTemplateColumns = '1.2fr 1fr 0.6fr 0.6fr 0.9fr 1.1fr 0.6fr'
  grid.style.gap = '8px'
  grid.style.alignItems = 'center'

  const headerCell = (txt) => {
    const d = document.createElement('div')
    d.textContent = txt
    d.style.fontSize = '12px'
    d.style.opacity = '0.8'
    d.style.fontWeight = '600'
    return d
  }
  const divider = () => {
    const d = document.createElement('div')
    d.style.gridColumn = '1 / -1'
    d.style.height = '1px'
    d.style.background = 'var(--border)'
    d.style.opacity = '0.7'
    return d
  }

  const makeInput = (placeholder) => {
    const i = document.createElement('input')
    i.type = 'text'
    i.placeholder = placeholder || ''
    i.style.width = '100%'
    i.style.border = '1px solid var(--border)'
    i.style.borderRadius = '8px'
    i.style.padding = '6px 8px'
    i.style.background = 'transparent'
    i.style.color = 'var(--fg)'
    i.style.outline = 'none'
    return i
  }

  const makeSelect = (options) => {
    const s = document.createElement('select')
    s.style.width = '100%'
    s.style.border = '1px solid var(--border)'
    s.style.borderRadius = '8px'
    s.style.padding = '6px 8px'
    s.style.background = 'transparent'
    s.style.color = 'var(--fg)'
    for (const opt of options) {
      const o = document.createElement('option')
      o.value = opt.value
      o.textContent = opt.label
      s.appendChild(o)
    }
    return s
  }

  const appendHeaders = () => {
    grid.appendChild(headerCell('后缀（逗号分隔）'))
    grid.appendChild(headerCell('显示名（可选）'))
    grid.appendChild(headerCell('文件树显示'))
    grid.appendChild(headerCell('图标'))
    grid.appendChild(headerCell('打开模式'))
    grid.appendChild(headerCell('pluginId / method'))
    grid.appendChild(headerCell('操作'))
    grid.appendChild(divider())
  }

  const makeRow = (rule) => {
    const extInput = makeInput('png, jpg, jpeg')
    extInput.value = Array.isArray(rule?.extensions) ? rule.extensions.join(', ') : ''

    const nameInput = makeInput('例如：Images')
    nameInput.value = typeof rule?.displayName === 'string' ? rule.displayName : ''

    const show = document.createElement('input')
    show.type = 'checkbox'
    show.checked = rule?.fileTree?.show !== false
    show.style.width = '16px'
    show.style.height = '16px'

    const iconSel = makeSelect([
      { value: 'file', label: 'file' },
      { value: 'pdf', label: 'pdf' },
    ])
    iconSel.value = rule?.fileTree?.icon === 'pdf' ? 'pdf' : 'file'

    const modeSel = makeSelect([
      { value: 'markdown', label: 'markdown' },
      { value: 'plugin', label: 'plugin' },
    ])
    modeSel.value = rule?.openWith?.mode === 'plugin' ? 'plugin' : 'markdown'

    const pluginIdInput = makeInput('image-viewer')
    pluginIdInput.value =
      rule?.openWith?.mode === 'plugin' && rule.openWith.pluginId
        ? String(rule.openWith.pluginId || '')
        : ''

    const methodInput = makeInput('open')
    methodInput.value =
      rule?.openWith?.mode === 'plugin' && rule.openWith.method
        ? String(rule.openWith.method || '')
        : ''

    const wrapPlugin = document.createElement('div')
    wrapPlugin.style.display = 'flex'
    wrapPlugin.style.flexDirection = 'column'
    wrapPlugin.style.gap = '6px'
    wrapPlugin.appendChild(pluginIdInput)
    wrapPlugin.appendChild(methodInput)

    const actions = document.createElement('div')
    actions.style.display = 'flex'
    actions.style.justifyContent = 'flex-end'
    const btnDel = mkBtn('删除', false)
    actions.appendChild(btnDel)

    const syncEnabled = () => {
      const isPlugin = modeSel.value === 'plugin'
      pluginIdInput.disabled = !isPlugin
      methodInput.disabled = !isPlugin
      wrapPlugin.style.opacity = isPlugin ? '1' : '0.55'
    }
    modeSel.addEventListener('change', syncEnabled)
    syncEnabled()

    const nodes = [extInput, nameInput, show, iconSel, modeSel, wrapPlugin, actions]
    for (const n of nodes) grid.appendChild(n)
    btnDel.addEventListener('click', () => {
      for (const n of nodes) {
        try { n.parentElement?.removeChild(n) } catch {}
      }
    })
  }

  appendHeaders()
  const current = await loadRules(ctx)
  for (const r of current) makeRow(r)

  const bar = document.createElement('div')
  bar.style.display = 'flex'
  bar.style.justifyContent = 'flex-start'
  bar.style.padding = '10px 0 0 0'
  const btnAdd = mkBtn('＋ 添加规则', false)
  btnAdd.addEventListener('click', () => {
    makeRow({ extensions: [], openWith: { mode: 'markdown' }, fileTree: { show: true, icon: 'file' } })
  })
  bar.appendChild(btnAdd)

  content.appendChild(grid)
  content.appendChild(bar)

  const footer = document.createElement('div')
  footer.style.display = 'flex'
  footer.style.gap = '8px'
  footer.style.justifyContent = 'flex-end'
  footer.style.padding = '10px 12px'
  footer.style.borderTop = '1px solid var(--border)'

  const btnCancel = mkBtn('取消', false)
  const btnDefault = mkBtn('恢复默认', false)
  const btnSave = mkBtn('保存并应用', true)

  const close = () => { try { overlay.parentElement?.removeChild(overlay) } catch {} }

  btnCancel.addEventListener('click', () => close())
  overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close() })

  btnDefault.addEventListener('click', () => {
    try { while (grid.firstChild) grid.removeChild(grid.firstChild) } catch {}
    appendHeaders()
    for (const r of getDefaultRules()) makeRow(r)
  })

  btnSave.addEventListener('click', async () => {
    try {
      const children = Array.from(grid.children)
      // 7 headers + divider = 8
      let idx = 8
      const rules = []
      while (idx < children.length) {
        const extInput = children[idx++]
        const nameInput = children[idx++]
        const showInput = children[idx++]
        const iconSel = children[idx++]
        const modeSel = children[idx++]
        const wrapPlugin = children[idx++]
        const actions = children[idx++]
        if (!actions) break

        const extRaw = String(extInput?.value || '')
        const exts = extRaw
          .split(/[,，\s]+/g)
          .map(normalizeExt)
          .filter(Boolean)
        if (!exts.length) continue

        const displayName = String(nameInput?.value || '').trim() || undefined
        const show = !!showInput?.checked
        const icon = iconSel?.value === 'pdf' ? 'pdf' : 'file'
        const mode = modeSel?.value === 'plugin' ? 'plugin' : 'markdown'

        let openWith = { mode: 'markdown' }
        if (mode === 'plugin') {
          const parts = Array.from(wrapPlugin?.querySelectorAll?.('input') || [])
          const pluginId = String(parts[0]?.value || '').trim()
          const method = String(parts[1]?.value || '').trim()
          if (!pluginId) throw new Error(`后缀 ${exts.join(', ')} 的打开模式为 plugin，但未填写 pluginId`)
          openWith = method ? { mode: 'plugin', pluginId, method } : { mode: 'plugin', pluginId }
        }

        rules.push({
          extensions: exts,
          displayName,
          fileTree: { show, icon },
          openWith,
        })
      }

      if (!rules.length) throw new Error('未配置任何有效规则')
      const sanitized = rules.map(sanitizeRule).filter(Boolean)
      if (!sanitized.length) throw new Error('未解析到有效规则')

      await saveRules(ctx, sanitized)
      await applyRules(ctx, sanitized)
      notice(ctx, 'ASP 规则已保存并生效', 'ok', 1800)
      close()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      notice(ctx, '保存失败：' + msg, 'err', 3600)
    }
  })

  footer.appendChild(btnCancel)
  footer.appendChild(btnDefault)
  footer.appendChild(btnSave)

  box.appendChild(header)
  box.appendChild(help)
  box.appendChild(content)
  box.appendChild(footer)
  overlay.appendChild(box)
  document.body.appendChild(overlay)
}

export async function deactivate() {
  // 后缀注册会在宿主侧随插件停用自动清理，无需手动释放
}
