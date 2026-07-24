import React from 'react'
import { createRoot } from 'react-dom/client'
import Host from './Host.jsx'
import Player from './Player.jsx'
import '@fontsource/yellowtail'
import '@fontsource/quicksand/400.css'
import '@fontsource/quicksand/600.css'
import '@fontsource/quicksand/700.css'
import './theme.css'

const isHost = /\/host\/?$/.test(window.location.pathname)
createRoot(document.getElementById('root')).render(isHost ? <Host /> : <Player />)
