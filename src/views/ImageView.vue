<script setup>
const images = [
  {
    id: 1,
    title: 'Random Image 1',
    url: 'https://picsum.photos/400/250?random=1'
  },
  {
    id: 2,
    title: 'Random Image 2',
    url: 'https://picsum.photos/400/250?random=2'
  },
  {
    id: 3,
    title: 'Random Image 3',
    url: 'https://picsum.photos/400/250?random=3'
  }
  ,
  {
    id: 4,
    title: 'Random Image 4',
    url: 'https://picsum.photos/400/250?random=4'
  }
   ,
  {
    id: 5,
    title: 'Random Image 5',
    url: 'https://picsum.photos/400/250?random=54'
  }
]
</script>

<template>
  <div>
    <h2>Static Image List</h2>
    <p>These are static image URLs from the internet.</p>

    <div class="image-list">
      <div class="image-card" v-for="image in images" :key="image.id">
        <img :src="image.url" :alt="image.title" />
        <h3>{{ image.title }}</h3>
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-list {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.image-card {
  width: 400px;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 8px;
}

.image-card img {
  width: 100%;
  height: auto;
  border-radius: 6px;
  display: block;
}
</style>