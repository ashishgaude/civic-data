import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { 
  Users, 
  Home, 
  List as ListIcon, 
  Search, 
  MapPin, 
  User, 
  ChevronRight,
  ChevronDown,
  Building2,
  Filter,
  BarChart3,
  Crown,
  Menu,
  X,
  Instagram,
  Linkedin,
  LayoutDashboard,
  Map as MapIcon,
  ArrowRight
} from 'lucide-react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts'
import StationMap from './components/StationMap'
import { ScanningLoader, TableSkeleton, CardSkeleton } from './components/Loading'
import './App.css'

// --- Components ---

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur border border-slate-700 text-white p-3 rounded-lg shadow-2xl text-xs z-50">
        <p className="font-semibold mb-2 pb-1 border-b border-slate-700">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
              {entry.name}
            </span>
            <span className="font-mono font-bold text-white">{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const KPICard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 ${colorClass}`}>
      <Icon size={64} />
    </div>
    <div className="relative z-10">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 tracking-tight">{value}</h3>
      {subtext && <p className={`text-xs mt-2 font-medium ${colorClass.replace('text-', 'text-opacity-80 text-')}`}>{subtext}</p>}
    </div>
  </div>
)

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center h-full text-center p-8">
    <div className="bg-slate-50 p-6 rounded-full mb-6 animate-pulse-slow">
      <Icon className="w-12 h-12 text-slate-300" />
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
    {action}
  </div>
)

// --- Main App ---

function App() {
  const [stations, setStations] = useState([])
  const [selectedStation, setSelectedStation] = useState(null)
  const [rawVoters, setRawVoters] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [loadingVoters, setLoadingVoters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('list') 
  
  // Feature #2: Global Search & Filters
  const [globalSearchTerm, setGlobalSearchTerm] = useState('')
  const [globalSearchResults, setGlobalSearchResults] = useState([])
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false)
  const [filterMode, setFilterMode] = useState('all') 
  const [highlightedVoterId, setHighlightedVoterId] = useState(null)
  
  // Feature #3: Global Analytics
  const [isGlobalView, setIsGlobalView] = useState(true)
  const [globalStats, setGlobalStats] = useState(null)
  const [loadingGlobal, setLoadingGlobal] = useState(false)
  const [globalError, setGlobalError] = useState(null)

  // Mobile Responsiveness
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024)

  useEffect(() => {
    fetchStations()
    fetchGlobalAnalytics()
    
    const handleResize = () => {
        setIsSidebarOpen(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (selectedStation) {
      setIsGlobalView(false)
      fetchVoters(selectedStation.id)
      if (window.innerWidth < 1024) setIsSidebarOpen(false)
    } else {
      setRawVoters([])
    }
  }, [selectedStation])

  // --- Data Fetching ---

  async function fetchGlobalAnalytics() {
    setLoadingGlobal(true)
    setGlobalError(null)
    setIsGlobalView(true)
    setSelectedStation(null)
    if (window.innerWidth < 1024) setIsSidebarOpen(false)
    
    try {
      const [demoRes, surnameRes, stationRes] = await Promise.all([
        supabase.rpc('get_global_demographics'),
        supabase.rpc('get_global_top_surnames', { limit_count: 10 }),
        supabase.rpc('get_top_stations_by_voters', { limit_count: 10 })
      ])

      if (demoRes.error) throw new Error(demoRes.error.message)
      if (surnameRes.error) throw new Error(surnameRes.error.message)
      if (stationRes.error) throw new Error(stationRes.error.message)

      setGlobalStats({
        demographics: demoRes.data,
        surnames: surnameRes.data,
        topStations: stationRes.data
      })
    } catch (err) {
      console.error("Error fetching global stats:", err)
      setGlobalError(err.message)
    } finally {
      setLoadingGlobal(false)
    }
  }

  useEffect(() => {
    if (highlightedVoterId && !loadingVoters && rawVoters.length > 0) {
      setTimeout(() => {
        const element = document.getElementById(`voter-${highlightedVoterId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => setHighlightedVoterId(null), 3000)
        }
      }, 500)
    }
  }, [highlightedVoterId, loadingVoters, rawVoters])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (globalSearchTerm.length > 2) {
        performGlobalSearch()
      } else {
        setGlobalSearchResults([])
      }
    }, 500)
    return () => clearTimeout(delayDebounceFn)
  }, [globalSearchTerm])

  async function performGlobalSearch() {
    setIsSearchingGlobal(true)
    const { data, error } = await supabase
      .from('voters')
      .select('*, polling_stations (id, polling_station_name)')
      .ilike('name', `%${globalSearchTerm}%`)
      .limit(8)
    
    if (error) console.error('Error searching:', error)
    else setGlobalSearchResults(data || [])
    setIsSearchingGlobal(false)
  }

  async function fetchStations() {
    setLoading(true)
    const { data, error } = await supabase
      .from('polling_stations')
      .select('*')
      .order('polling_station_name')
    
    if (error) console.error('Error fetching stations:', error)
    else setStations(data || [])
    setLoading(false)
  }

  async function fetchVoters(stationId) {
    setLoadingVoters(true)
    const { data, error } = await supabase
      .from('voters')
      .select('*')
      .eq('polling_station_id', stationId)
      .order('house_number')
      .order('name')
    
    if (error) console.error('Error fetching voters:', error)
    else setRawVoters(data || [])
    setLoadingVoters(false)
  }

  const selectGlobalResult = (result) => {
    const station = stations.find(s => s.id === result.polling_stations.id)
    if (station) {
      setSelectedStation(station)
      setGlobalSearchTerm('')
      setGlobalSearchResults([])
      setHighlightedVoterId(result.id)
      setFilterMode('all')
      if (window.innerWidth < 1024) setIsSidebarOpen(false)
    }
  }

  const handleVoterClick = (voter) => {
    setViewMode('family')
    setHighlightedVoterId(voter.id)
  }

  // --- Logic Helpers ---

  const { voters, familyMap } = useMemo(() => {
    if (!rawVoters.length) return { voters: [], familyMap: {} }
    const grouped = rawVoters.reduce((acc, voter) => {
      const house = voter.house_number ? voter.house_number.trim() : 'Unknown'
      if (!acc[house]) acc[house] = []
      acc[house].push({ ...voter })
      return acc
    }, {})

    const processedFamilies = {}
    const allNodes = []

    Object.entries(grouped).forEach(([house, members]) => {
        const tree = buildFamilyTree(members)
        tree.forEach(root => {
            const size = calculateTreeSize(root)
            if (size >= 4) {
                root.isInfluencer = true
                root.influenceScore = size
            }
        })
        processedFamilies[house] = { houseNo: house, count: members.length, tree: tree }
        
        const traverse = (nodes) => {
            nodes.forEach(n => {
                allNodes.push(n)
                if (n.spouse) allNodes.push(n.spouse)
                if (n.children) traverse(n.children)
            })
        }
        traverse(tree)
    })
    
    allNodes.sort((a, b) => {
        const hA = a.house_number || ''
        const hB = b.house_number || ''
        if (hA !== hB) return hA.localeCompare(hB, undefined, { numeric: true, sensitivity: 'base' })
        return a.name.localeCompare(b.name)
    })

    return { voters: allNodes, familyMap: processedFamilies }
  }, [rawVoters])

  function calculateTreeSize(node) {
      let count = 1
      if (node.spouse) count += 1
      if (node.children) node.children.forEach(c => count += calculateTreeSize(c))
      return count
  }

  const filteredVoters = useMemo(() => {
    if (!voters) return []
    switch (filterMode) {
      case 'senior': return voters.filter(v => (v.age || 0) >= 60)
      case 'youth': return voters.filter(v => (v.age || 0) >= 18 && (v.age || 0) <= 25)
      case 'women': return voters.filter(v => v.gender === 'Female')
      case 'large_family':
        const counts = {}
        voters.forEach(v => {
            const h = v.house_number ? v.house_number.trim() : 'Unknown'
            counts[h] = (counts[h] || 0) + 1
        })
        return voters.filter(v => counts[v.house_number ? v.house_number.trim() : 'Unknown'] >= 5)
      case 'influencer': return voters.filter(v => v.isInfluencer)
      default: return voters
    }
  }, [voters, filterMode])

  const demographics = useMemo(() => {
    if (!voters.length) return null
    const ageGroups = { '18-29': 0, '30-45': 0, '46-60': 0, '60+': 0 }
    const genderStats = { Male: 0, Female: 0, Other: 0 }
    const surnameCounts = {}
    const ignoreList = ['PHOTO', 'AVAILABLE', 'VOTER', 'NAME', 'HUSBAND', 'FATHER', 'MOTHER', 'HOUSE', 'NUMBER', 'FEMALE', 'MALE', 'OTHER']

    voters.forEach(v => {
      const age = v.age || 0
      if (age >= 18 && age <= 29) ageGroups['18-29']++
      else if (age >= 30 && age <= 45) ageGroups['30-45']++
      else if (age >= 46 && age <= 60) ageGroups['46-60']++
      else if (age > 60) ageGroups['60+']++

      if (v.gender === 'Male') genderStats.Male++
      else if (v.gender === 'Female') genderStats.Female++
      else genderStats.Other++

      if (v.name) {
        const cleanName = v.name.replace(/[^a-zA-Z\s]/g, ' ').trim()
        const parts = cleanName.split(/\s+/)
        if (parts.length > 1) {
          const surname = parts[parts.length - 1].toUpperCase()
          if (surname.length > 2 && !ignoreList.includes(surname)) {
            surnameCounts[surname] = (surnameCounts[surname] || 0) + 1
          }
        }
      }
    })

    const ageData = Object.keys(ageGroups).map(key => ({ name: key, count: ageGroups[key] }))
    const genderData = Object.keys(genderStats).filter(k => genderStats[k] > 0).map(key => ({ name: key, value: genderStats[key] }))
    const surnameData = Object.entries(surnameCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }))

    return { ageData, genderData, surnameData }
  }, [voters])

  const families = useMemo(() => {
    const relevantHouses = new Set(filteredVoters.map(v => v.house_number ? v.house_number.trim() : 'Unknown'))
    return Object.values(familyMap)
      .filter(fam => relevantHouses.has(fam.houseNo))
      .sort((a, b) => a.houseNo.localeCompare(b.houseNo, undefined, { numeric: true, sensitivity: 'base' }))
  }, [filteredVoters, familyMap])

  function buildFamilyTree(members) {
    const memberMap = {}
    const memberList = members.map(m => {
      const node = { ...m, children: [], spouse: null, isRoot: true }
      node._simpleName = m.name.toLowerCase().replace(/[^a-z]/g, '')
      memberMap[m.id] = node
      return node
    })

    const findMemberIdByName = (rawName, type) => {
      if (!rawName) return null
      const target = rawName.toLowerCase().replace(/[^a-z]/g, '')
      const match = memberList.find(m => {
        if (type === 'Husbands' || type === 'Fathers') { if (m.gender === 'Female') return false }
        if (type === 'Mothers' || type === 'Wives') { if (m.gender === 'Male') return false }
        return m._simpleName === target
      })
      return match ? match.id : null
    }

    memberList.forEach(member => {
      if (!member.relative_name) return
      const relativeId = findMemberIdByName(member.relative_name, member.relative_type)
      if (relativeId) {
        const relativeNode = memberMap[relativeId]
        if (member.relative_type === 'Husbands' || member.relative_type === 'Wives') {
          if (!relativeNode.spouse) {
            relativeNode.spouse = member
            member.isRoot = false 
          }
        } else if (member.relative_type === 'Fathers' || member.relative_type === 'Mothers') {
          relativeNode.children.push(member)
          member.isRoot = false
        }
      }
    })
    return memberList.filter(m => m.isRoot)
  }

  const FamilyNode = ({ node }) => (
    <div className="flex flex-col relative pl-6 border-l border-slate-200 ml-3 py-2">
      <div className="absolute top-6 left-0 w-6 h-px bg-slate-200"></div>
      <div className="flex flex-wrap items-center gap-3">
        <div 
          id={`voter-${node.id}`}
          className={`flex items-center p-3 rounded-xl border shadow-sm bg-white min-w-[220px] transition-all duration-300 relative group
            ${node.gender === 'Female' ? 'border-rose-100 hover:border-rose-200' : 'border-indigo-100 hover:border-indigo-200'}
            ${highlightedVoterId === node.id ? 'ring-2 ring-amber-400 bg-amber-50 scale-105 z-10' : ''} 
            ${node.isInfluencer ? 'border-amber-300 ring-1 ring-amber-100' : ''}`}
        >
          {node.isInfluencer && (
            <div className="absolute -top-3 -right-2 bg-amber-400 text-white rounded-full p-1.5 shadow-md z-10 animate-bounce-slow" title="Head of Household">
              <Crown className="w-3 h-3" />
            </div>
          )}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold mr-3 border-2 shadow-sm
             ${node.gender === 'Female' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
            {getInitials(node.name)}
          </div>
          <div>
             <div className="text-sm font-bold text-slate-800 leading-tight group-hover:text-slate-900">{node.name}</div>
             <div className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1">
               <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{node.age || '?'}y</span>
               <span>{node.gender}</span>
             </div>
          </div>
        </div>

        {node.spouse && (
          <div className="flex items-center">
             <div className="h-px w-4 bg-rose-200"></div>
             <div className="text-[10px] text-rose-400 font-bold px-1 animate-pulse">♥</div>
             <div className="h-px w-4 bg-rose-200"></div>
             
             <div 
               id={`voter-${node.spouse.id}`}
               className={`flex items-center p-3 rounded-xl border shadow-sm bg-rose-50/50 border-rose-100 min-w-[200px] transition-all duration-300
                 ${highlightedVoterId === node.spouse.id ? 'ring-2 ring-amber-400 bg-amber-50 scale-105 z-10' : ''}`}
             >
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold mr-3 border-2 bg-white text-rose-500 border-rose-100 shadow-sm">
                {getInitials(node.spouse.name)}
              </div>
              <div>
                <div className="text-sm font-bold text-slate-800 leading-tight">{node.spouse.name}</div>
                <div className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center gap-1">
                   <span className="bg-white/80 px-1.5 py-0.5 rounded text-rose-600">{node.spouse.age || '?'}y</span>
                   <span>Spouse</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="mt-2">
          {node.children.sort((a, b) => (b.age || 0) - (a.age || 0)).map(child => (
            <FamilyNode key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  )

  const filteredStations = stations.filter(station => 
    station.polling_station_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    station.main_town_or_village?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getInitials = (name) => name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const COLORS = ['#6366f1', '#f43f5e', '#a855f7', '#10b981', '#f59e0b']

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* --- SIDEBAR --- */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 flex flex-col shadow-2xl transition-transform duration-300 transform lg:relative lg:translate-x-0 w-80 shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-100 bg-white flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">CivicData</h1>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Election Command</p>
              </div>
            </div>
            <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={fetchGlobalAnalytics}
            className={`w-full flex items-center p-3 rounded-xl transition-all duration-200 font-semibold text-sm border shadow-sm group ${
              isGlobalView 
                ? 'bg-slate-900 text-white border-slate-900 shadow-lg' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 mr-3 ${isGlobalView ? 'text-indigo-400' : 'text-slate-400 group-hover:text-indigo-500'}`} />
            Global Dashboard
          </button>

          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter stations list..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Polling Stations ({filteredStations.length})
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : (
            filteredStations.map(station => (
              <button
                key={station.id}
                onClick={() => setSelectedStation(station)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 group relative border ${
                  selectedStation?.id === station.id 
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-900 shadow-sm' 
                    : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {selectedStation?.id === station.id && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-full"></div>
                )}
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-xs leading-snug pr-2 line-clamp-2">
                    {station.polling_station_name}
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    selectedStation?.id === station.id ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {station.number_of_electors}
                  </span>
                </div>
                <div className="flex items-center mt-1.5 text-[10px] opacity-70">
                  <MapPin className="w-3 h-3 mr-1" />
                  <span className="truncate">{station.main_town_or_village}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex flex-col items-center space-y-4">
            <p className="text-xs font-medium text-slate-500 flex items-center">
              Made with <span className="text-rose-500 mx-1 animate-pulse">❤️</span> by Ashish
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://instagram.com/ashishgaude.ig" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-pink-500 transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a 
                href="https://www.linkedin.com/in/ashishgaude/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 w-full flex flex-col h-full overflow-hidden relative bg-slate-50/50">
        
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 z-20 shadow-sm sticky top-0 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button className="lg:hidden text-slate-500" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Context Breadcrumbs / Title */}
            <div className="flex flex-col">
               <h2 className="text-sm font-bold text-slate-800 flex items-center">
                 {isGlobalView ? (
                   <>
                    <LayoutDashboard className="w-4 h-4 mr-2 text-indigo-500" />
                    Global Dashboard
                   </>
                 ) : selectedStation ? (
                   <>
                    <span className="text-slate-400 font-medium mr-2 hidden md:inline">Constituency {selectedStation.assembly_constituency}</span>
                    <ChevronRight className="w-3 h-3 text-slate-300 mr-2 hidden md:inline" />
                    <span className="truncate max-w-[200px] md:max-w-md">{selectedStation.polling_station_name}</span>
                   </>
                 ) : 'Welcome'}
               </h2>
            </div>
          </div>

          {/* Persistent Global Search */}
          <div className="relative w-full max-w-md ml-4 hidden md:block group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all shadow-sm"
              placeholder="Search any voter by name across all stations..."
              value={globalSearchTerm}
              onChange={(e) => setGlobalSearchTerm(e.target.value)}
            />
            {/* Search Results Dropdown */}
            {(globalSearchResults.length > 0 || isSearchingGlobal) && globalSearchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 max-h-80 overflow-y-auto z-50 p-2">
                 {isSearchingGlobal ? (
                   <div className="p-4 text-xs text-center text-slate-400">Searching database...</div>
                 ) : (
                   <ul>
                     <li className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Results</li>
                     {globalSearchResults.map(res => (
                       <li key={res.id}>
                         <button 
                            onClick={() => selectGlobalResult(res)}
                            className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 rounded-lg flex flex-col group transition-colors"
                         >
                           <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{res.name}</span>
                           <span className="text-xs text-slate-500 mt-0.5 flex items-center">
                             <MapPin className="w-3 h-3 mr-1" />
                             {res.polling_stations?.polling_station_name}
                           </span>
                         </button>
                       </li>
                     ))}
                   </ul>
                 )}
              </div>
            )}
          </div>
        </header>

        {isGlobalView ? (
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {loadingGlobal ? (
                 <ScanningLoader text="Aggregating electoral data..." />
              ) : globalError ? (
                <EmptyState icon={Filter} title="Analytics Unavailable" description={globalError} 
                  action={
                    <div className="bg-rose-50 text-rose-700 px-4 py-2 rounded-lg text-sm border border-rose-200">
                      Run the SQL setup script in Supabase.
                    </div>
                  } 
                />
              ) : globalStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <KPICard title="Total Electorate" value={globalStats.demographics.total_voters?.toLocaleString()} subtext="Across all stations" icon={Users} colorClass="text-indigo-500" />
                    <KPICard title="Male Voters" value={globalStats.demographics.gender_counts.Male?.toLocaleString()} subtext="Registered Men" icon={User} colorClass="text-blue-500" />
                    <KPICard title="Female Voters" value={globalStats.demographics.gender_counts.Female?.toLocaleString()} subtext="Registered Women" icon={User} colorClass="text-rose-500" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">Age Demographics</h3>
                      <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={Object.entries(globalStats.demographics.age_counts).map(([k,v]) => ({name: k, value: v}))}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">Largest Polling Stations</h3>
                      <ResponsiveContainer width="100%" height="85%">
                        <BarChart data={globalStats.topStations} layout="vertical" margin={{ left: 0, right: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis dataKey="station_name" type="category" width={180} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={0} tickFormatter={(v) => v.length > 25 ? `${v.substring(0, 25)}...` : v} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="voter_count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                      <MapIcon className="w-5 h-5 mr-2 text-orange-500" />
                      Constituency Map
                    </h3>
                    <div className="h-[500px] w-full rounded-xl overflow-hidden border border-slate-100 relative z-0">
                      <StationMap stations={stations} onSelectStation={(s) => { setSelectedStation(s); setIsGlobalView(false); }} />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ) : selectedStation ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Station Sub-Header: Controls */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {['list', 'family', 'analytics'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                      viewMode === mode 
                        ? 'bg-white text-indigo-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode} View
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
                 {[{ id: 'all', label: 'All' }, { id: 'senior', label: '60+' }, { id: 'youth', label: '18-25' }, { id: 'women', label: 'Women' }, { id: 'large_family', label: 'Big Families' }, { id: 'influencer', label: 'Influencers' }].map(f => (
                   <button
                     key={f.id}
                     onClick={() => setFilterMode(f.id)}
                     className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                       filterMode === f.id 
                        ? 'bg-slate-800 text-white border-slate-800' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                     }`}
                   >
                     {f.label}
                   </button>
                 ))}
              </div>
            </div>

            {/* Station Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
              <div className="max-w-7xl mx-auto">
                {loadingVoters ? (
                   <TableSkeleton rows={10} />
                ) : voters.length === 0 ? (
                  <EmptyState icon={Search} title="No records found" description="Try adjusting your search filters or select a different station." />
                ) : (
                  <>
                    {/* Stats Strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Voters</div>
                        <div className="text-2xl font-bold text-slate-800">{voters.length}</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Households</div>
                        <div className="text-2xl font-bold text-slate-800">{families.length}</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Gender (F)</div>
                        <div className="text-2xl font-bold text-rose-500">{demographics?.genderData.find(d => d.name === 'Female')?.value || 0}</div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Influencers</div>
                        <div className="text-2xl font-bold text-amber-500">{voters.filter(v => v.isInfluencer).length}</div>
                      </div>
                    </div>

                    {viewMode === 'list' && (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-6 py-4">Voter</th>
                                <th className="px-6 py-4">Relation</th>
                                <th className="px-6 py-4">Demographics</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4 text-right">ID</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredVoters.map((voter) => (
                                <tr 
                                  key={voter.id} 
                                  id={`voter-${voter.id}`}
                                  onClick={() => handleVoterClick(voter)}
                                  className={`transition-all duration-300 cursor-pointer group ${
                                    highlightedVoterId === voter.id 
                                      ? 'bg-amber-50 ring-inset ring-2 ring-amber-400 z-10 relative' 
                                      : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="px-6 py-3">
                                    <div className="flex items-center">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold mr-3 border-2 shadow-sm
                                        ${voter.gender === 'Female' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}
                                        ${voter.isInfluencer ? 'ring-2 ring-amber-400 border-amber-400' : ''}
                                      `}>
                                        {getInitials(voter.name)}
                                      </div>
                                      <div>
                                        <div className="font-semibold text-slate-900 flex items-center">
                                          {voter.name}
                                          {voter.isInfluencer && <Crown className="w-3 h-3 text-amber-500 ml-1.5" fill="currentColor" />}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-slate-600">
                                    <div className="flex flex-col">
                                      <span className="text-slate-900 font-medium">{voter.relative_name}</span>
                                      <span className="text-xs text-slate-400 capitalize">{voter.relative_type}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                      {voter.age}y • {voter.gender}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                      <Home className="w-3 h-3 text-slate-400" />
                                      {voter.house_number}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <span className="font-mono text-xs text-slate-400">{voter.voter_id || '-'}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {viewMode === 'family' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {families.map(({ houseNo, count, tree }) => (
                          <div key={houseNo} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300">
                            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex justify-between items-center">
                              <div className="flex items-center text-slate-700 font-bold">
                                <div className="bg-white p-1.5 rounded-md shadow-sm border border-slate-200 mr-3 text-indigo-600">
                                  <Home className="w-4 h-4" />
                                </div>
                                <span className="text-lg">#{houseNo}</span>
                              </div>
                              <span className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                                {count}
                              </span>
                            </div>
                            <div className="p-4 flex-1 overflow-x-auto bg-slate-50/30">
                              {tree.length > 0 ? (
                                <div className="-ml-2">
                                  {tree.map(rootNode => <FamilyNode key={rootNode.id} node={rootNode} />)}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-400 italic text-center py-4">No relationships detected.</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {viewMode === 'analytics' && demographics && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                          <h3 className="text-lg font-bold text-slate-800 mb-6">Age Distribution</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={demographics.ageData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                          <h3 className="text-lg font-bold text-slate-800 mb-6">Top Surnames</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={demographics.surnameData} layout="vertical" margin={{ left: 0, right: 30 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                              <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis dataKey="name" type="category" width={140} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={0} />
                              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState 
            icon={Building2} 
            title="Select a Polling Station" 
            description="Browse the list on the left or use the global search to find a specific voter record." 
          />
        )}
      </main>
    </div>
  )
}

export default App