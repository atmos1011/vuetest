<template>
  <div>
    <nav style="margin-bottom: 20px;">
      <router-link to="/" style="margin-right: 10px;">Home</router-link>
      <router-link to="/table">My static table</router-link>
    </nav>

    <router-view />
  </div>
</template>