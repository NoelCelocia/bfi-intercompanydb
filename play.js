// First promise returns an array
const getUsers = () => {
    return new Promise((resolve, reject) => {
      return setTimeout(() => resolve([{ id: 'jon' }, { id: 'andrey' }, { id: 'tania' }]), 600)
    })
  }
  
  // Second promise relies on the resulting array of first promise
  const getIdFromUser = users => {
    return new Promise((resolve, reject) => {
      return setTimeout(() => resolve(users.id), 500)
    })
  }
  
  // Third promise relies on the result of the second promise
  const capitalizeIds = id => {
    return new Promise((resolve, reject) => {
      return setTimeout(() => resolve(id.toUpperCase()), 200)
    })
  }
  
  const runAsyncFunctions = async () => {
    const users = await getUsers()
  
    Promise.all(
      users.map(async user => {
        const userId = await getIdFromUser(user)
        console.log(userId)
  
        const capitalizedId = await capitalizeIds(userId)
        console.log(capitalizedId)
      })
    )
  
    console.log(users)
  }
  
  runAsyncFunctions()