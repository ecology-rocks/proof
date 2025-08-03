const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: '/statements', component: () => import('pages/StatementsPage.vue') },
      { path: '/evidence', component: () => import('pages/EvidencePage.vue') }, 
      { path: '/documents', component: () => import('pages/DocumentsPage.vue') }, 
      { path: '/statement/:id', component: () => import('pages/StatementDetailPage.vue') },
      { path: '/reference/:id', component: () => import('pages/ReferenceDetailPage.vue') },
      { path: '/document/:id', component: () => import('pages/DocumentDetailPage.vue') },
      { path: '/evidence/:id', component: () => import('pages/EvidenceDetailPage.vue') }
    ]
  },




  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
