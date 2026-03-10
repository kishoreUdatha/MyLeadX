import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  MessageSquare,
  BarChart3,
  Zap,
  Shield,
  Bot,
  ArrowRight,
  CheckCircle,
  Mail,
  FileText,
  Globe,
  Calendar,
  Target,
  Headphones,
  Database,
  PieChart,
  PhoneCall,
  Send,
  Code,
  Building2,
  GraduationCap,
  Home,
  Briefcase,
  ShoppingBag,
  IndianRupee,
  Check,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">VoiceCRM</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#industries" className="text-gray-600 hover:text-gray-900">Industries</a>
              <Link to="/pricing" className="text-gray-600 hover:text-gray-900">Pricing</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register?plan=starter"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <IndianRupee className="w-4 h-4" />
              Made for India | AI Voice + WhatsApp + CRM in One
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Let <span className="text-blue-600">AI Call Your Leads</span>
              <br />While You Close Deals
            </h1>
            <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
              India's first CRM with built-in AI voice agents. Make thousands of calls,
              send WhatsApp campaigns, and convert leads faster - all from one platform.
            </p>
            <p className="text-lg text-blue-600 font-semibold mb-8">
              No more juggling 5 different tools. No more expensive integrations.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register?plan=starter"
                className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/pricing"
                className="w-full sm:w-auto bg-white border-2 border-gray-200 text-gray-900 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition flex items-center justify-center gap-2"
              >
                View Pricing
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Free plan available. No credit card required.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="text-3xl font-bold text-blue-600">50,000+</div>
              <div className="text-sm text-gray-600 mt-1">AI Calls/Day</div>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="text-3xl font-bold text-green-600">89%</div>
              <div className="text-sm text-gray-600 mt-1">Answer Rate</div>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="text-3xl font-bold text-purple-600">3x</div>
              <div className="text-sm text-gray-600 mt-1">More Conversions</div>
            </div>
            <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
              <div className="text-3xl font-bold text-orange-600">60%</div>
              <div className="text-sm text-gray-600 mt-1">Cost Savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Makes Us <span className="text-blue-600">Different</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Differentiator 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Calls Built-In</h3>
              <p className="text-gray-600 mb-4">
                No need to integrate Qcall.ai, Exotel IVR, or any third-party AI calling service.
                Our AI agents make calls directly from the CRM.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Natural voice conversations
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  24/7 automated outreach
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Real-time transcription
                </li>
              </ul>
            </div>

            {/* Differentiator 2 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-8">
              <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">All Channels, One Place</h3>
              <p className="text-gray-600 mb-4">
                Stop switching between WhatsApp Business, SMS gateways, and email tools.
                Everything is unified in one dashboard.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  WhatsApp bulk + templates
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  SMS with delivery tracking
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Email campaigns + automation
                </li>
              </ul>
            </div>

            {/* Differentiator 3 */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-8">
              <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mb-6">
                <IndianRupee className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Made for India</h3>
              <p className="text-gray-600 mb-4">
                Built specifically for Indian businesses with local integrations,
                INR pricing, and TRAI compliance.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-orange-600" />
                  Exotel, Wati, Gupshup ready
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-orange-600" />
                  DNC/TRAI compliance
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-orange-600" />
                  UPI & Indian payment support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Perfect for <span className="text-blue-600">Your Industry</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tailored solutions for high-volume lead businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Education */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                <GraduationCap className="w-7 h-7 text-blue-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Education</h3>
              <p className="text-gray-600 text-sm mb-4">
                Universities, colleges, coaching centers, and EdTech companies
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Admission inquiry calls
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Course information via WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Counselor assignment
                </li>
              </ul>
            </div>

            {/* Real Estate */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-600 transition">
                <Home className="w-7 h-7 text-green-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Real Estate</h3>
              <p className="text-gray-600 text-sm mb-4">
                Builders, brokers, and property portals
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Site visit scheduling
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Property details on WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Lead from 99acres, MagicBricks
                </li>
              </ul>
            </div>

            {/* Insurance & Finance */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 transition">
                <Briefcase className="w-7 h-7 text-purple-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Insurance & Finance</h3>
              <p className="text-gray-600 text-sm mb-4">
                Insurance agents, loan DSAs, and financial advisors
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Policy renewal reminders
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Loan eligibility calls
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Document collection via WhatsApp
                </li>
              </ul>
            </div>

            {/* D2C & E-commerce */}
            <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition group">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-600 transition">
                <ShoppingBag className="w-7 h-7 text-orange-600 group-hover:text-white transition" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">D2C & E-commerce</h3>
              <p className="text-gray-600 text-sm mb-4">
                Online brands and e-commerce stores
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Cart abandonment calls
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Order updates on WhatsApp
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  COD confirmation calls
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features, <span className="text-blue-600">Simple to Use</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to capture, nurture, and convert leads
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* AI Voice */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-blue-50 transition">
              <Bot className="w-10 h-10 text-blue-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">AI Voice Agents</h4>
              <p className="text-sm text-gray-600">Natural conversations that qualify leads 24/7</p>
            </div>

            {/* Outbound Calls */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-blue-50 transition">
              <PhoneCall className="w-10 h-10 text-blue-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Automated Calling</h4>
              <p className="text-sm text-gray-600">Make thousands of calls simultaneously</p>
            </div>

            {/* WhatsApp */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-green-50 transition">
              <MessageSquare className="w-10 h-10 text-green-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">WhatsApp Campaigns</h4>
              <p className="text-sm text-gray-600">Bulk messaging with templates & media</p>
            </div>

            {/* SMS */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-purple-50 transition">
              <Send className="w-10 h-10 text-purple-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">SMS Campaigns</h4>
              <p className="text-sm text-gray-600">Instant delivery with tracking</p>
            </div>

            {/* Email */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-red-50 transition">
              <Mail className="w-10 h-10 text-red-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Email Marketing</h4>
              <p className="text-sm text-gray-600">Automated sequences & templates</p>
            </div>

            {/* Lead Management */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-yellow-50 transition">
              <Database className="w-10 h-10 text-yellow-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Lead Database</h4>
              <p className="text-sm text-gray-600">Store & organize unlimited leads</p>
            </div>

            {/* Lead Scoring */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-orange-50 transition">
              <Target className="w-10 h-10 text-orange-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">AI Lead Scoring</h4>
              <p className="text-sm text-gray-600">Prioritize hot leads automatically</p>
            </div>

            {/* Telecaller Queue */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-cyan-50 transition">
              <Headphones className="w-10 h-10 text-cyan-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Telecaller Queue</h4>
              <p className="text-sm text-gray-600">Smart queue for human agents</p>
            </div>

            {/* Forms */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-indigo-50 transition">
              <FileText className="w-10 h-10 text-indigo-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Custom Forms</h4>
              <p className="text-sm text-gray-600">Drag-drop form builder</p>
            </div>

            {/* Landing Pages */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-teal-50 transition">
              <Globe className="w-10 h-10 text-teal-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Landing Pages</h4>
              <p className="text-sm text-gray-600">Beautiful pages with templates</p>
            </div>

            {/* Analytics */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-pink-50 transition">
              <PieChart className="w-10 h-10 text-pink-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Real-time Analytics</h4>
              <p className="text-sm text-gray-600">Track calls, conversions, ROI</p>
            </div>

            {/* Automation */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-violet-50 transition">
              <Zap className="w-10 h-10 text-violet-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Workflow Automation</h4>
              <p className="text-sm text-gray-600">Auto follow-ups & assignments</p>
            </div>

            {/* Calendar */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-emerald-50 transition">
              <Calendar className="w-10 h-10 text-emerald-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Appointment Booking</h4>
              <p className="text-sm text-gray-600">Schedule demos & meetings</p>
            </div>

            {/* API */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-slate-100 transition">
              <Code className="w-10 h-10 text-slate-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">REST API</h4>
              <p className="text-sm text-gray-600">Integrate with any system</p>
            </div>

            {/* Security */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-rose-50 transition">
              <Shield className="w-10 h-10 text-rose-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Enterprise Security</h4>
              <p className="text-sm text-gray-600">SSO, encryption, DNC compliance</p>
            </div>

            {/* Social Ads */}
            <div className="bg-gray-50 rounded-2xl p-6 hover:bg-sky-50 transition">
              <Building2 className="w-10 h-10 text-sky-600 mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Social Media Ads</h4>
              <p className="text-sm text-gray-600">Capture leads from FB, Google</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Get Started in <span className="text-blue-600">3 Simple Steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign Up Free</h3>
              <p className="text-gray-600">
                Create your account in 2 minutes. No credit card required.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Leads</h3>
              <p className="text-gray-600">
                Upload CSV, connect forms, or capture from ads.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Start Converting</h3>
              <p className="text-gray-600">
                Let AI call, WhatsApp, and nurture your leads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent <span className="text-blue-600">Pricing</span>
            </h2>
            <p className="text-xl text-gray-600">
              Start free, upgrade as you grow
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-6 text-center">
              <h3 className="font-bold text-gray-900 mb-2">Free</h3>
              <div className="text-3xl font-bold text-green-600 mb-2">₹0</div>
              <p className="text-sm text-gray-600 mb-4">100 leads, 1 user</p>
              <Link to="/register?plan=free" className="text-blue-600 font-medium text-sm hover:underline">
                Get Started →
              </Link>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 text-center">
              <h3 className="font-bold text-gray-900 mb-2">Starter</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">₹1,499<span className="text-sm font-normal">/mo</span></div>
              <p className="text-sm text-gray-600 mb-4">2K leads, 50 AI calls</p>
              <Link to="/pricing" className="text-blue-600 font-medium text-sm hover:underline">
                View Details →
              </Link>
            </div>
            <div className="bg-blue-600 rounded-2xl p-6 text-center text-white relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                POPULAR
              </div>
              <h3 className="font-bold mb-2">Growth</h3>
              <div className="text-3xl font-bold mb-2">₹3,999<span className="text-sm font-normal">/mo</span></div>
              <p className="text-sm text-blue-100 mb-4">10K leads, 200 AI calls</p>
              <Link to="/pricing" className="text-white font-medium text-sm hover:underline">
                View Details →
              </Link>
            </div>
            <div className="bg-gray-50 rounded-2xl p-6 text-center">
              <h3 className="font-bold text-gray-900 mb-2">Business</h3>
              <div className="text-3xl font-bold text-gray-900 mb-2">₹7,999<span className="text-sm font-normal">/mo</span></div>
              <p className="text-sm text-gray-600 mb-4">50K leads, 1000 AI calls</p>
              <Link to="/pricing" className="text-blue-600 font-medium text-sm hover:underline">
                View Details →
              </Link>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:underline"
            >
              See full pricing & comparison
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to 3x Your Lead Conversions?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of Indian businesses using AI to scale their sales.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register?plan=starter"
              className="w-full sm:w-auto bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-50 transition flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="mailto:sales@voicecrm.in"
              className="w-full sm:w-auto border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition"
            >
              Talk to Sales
            </a>
          </div>
          <p className="text-blue-200 text-sm mt-6">
            No credit card required. 14-day free trial on all paid plans.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">VoiceCRM</span>
              </div>
              <p className="text-sm">
                India's first CRM with built-in AI voice agents.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><Link to="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><a href="#industries" className="hover:text-white">Industries</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">TRAI Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center text-sm">
            <p>&copy; {new Date().getFullYear()} VoiceCRM. All rights reserved.</p>
            <p className="mt-2 md:mt-0">Made with ❤️ in India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
