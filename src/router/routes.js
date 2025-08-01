const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/IndexPage.vue') },
      { path: '/reference/:id', component: () => import('pages/ReferenceDetailPage.vue') },
       { path: '/statements', component: () => import('pages/StatementsPage.vue') },
        { path: '/evidence', component: () => import('pages/EvidencePage.vue') }, // Add this line
         { path: '/statement/:id', component: () => import('pages/StatementDetailPage.vue') },
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
