import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useReducer, useState } from 'react'
import styles from '../styles/Home.module.css'
import axios from 'axios';

export default function Home() {
  const [inputValues, setInputValues] = useReducer(
    (state, newState) => ({ ...state, ...newState }),
    {
      term: '',
      daily: '',
    }
  );
  const [videoIds, setVideoIds] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [fiveMost, setFiveMost] = useState('');
  const [longestDay, setLongestDay] = useState(0);
  const [dailyInSecond, setDailyInSecond] = useState(0);
  const [daysAmount, setDaysAmount] = useState(0);
  const myMap = new Map();

  const searchUrl = 'https://www.googleapis.com/youtube/v3/search';
  const videoUrl = 'https://www.googleapis.com/youtube/v3/videos';
  const apiKey = '';
  const maxResults = 200;

  const extractVideoIds = (items) => {
    let arrIds = [];
    items.forEach((value, index, array) => {
      arrIds.push(value.id.videoId);
      readText(value.snippet.title);
      readText(value.snippet.description);
      if (index === array.length-1) {
        setVideoIds(arrIds);
        setFiveMost(getTheFive());
      }
    });
  };

  const readText = (text) => {
    text.split(' ').forEach(word => {
      if (word && word.match(".*[a-zA-Z1-9].*") && word.length > 2) {
        word = word.toLowerCase();
        if (myMap.has(word)) {
          let count = myMap.get(word);
          count ++;
          myMap.set(word, count);
        } else {
          myMap.set(word, 1);
        }
      }
    });
  };

  const getTheFive = () => {
    const sortedWordMap = new Map([...myMap.entries()].sort((a, b) => b[1] - a[1]));
    let result = Array.from(sortedWordMap.keys()).filter( (word, index) => index < 5);
    result = result.map(res => {
      res = res.replace(/[/.,]/g, '')
      if (res !== "") {
          return res
      }
    });
    // console.log(result);
    return (result.filter(res => res !== undefined)).toString();
  };

  const validateDaily = (str) => {
    let days = str.split(',');
    console.log(days);
    if (days.length !== 7) {
      alert('Foi informado uma quantidade diferente de 7');
    }
    let newDays = days.map((day, index) => {
      day = parseInt(day);
      if (day > 1440) {
        let dayInTxt = index+1;
        alert(`O dia ${dayInTxt} está acima da quantidade máxima de um dia`);
      }
      return day*60;
    });
    console.log(newDays);
    setDailyInSecond(newDays);
    setLongestDay(getLongestDay(newDays));
  };

  const getLongestDay = (daysInSecond = []) => {
    let sortedDays = [...daysInSecond].sort((a, b) => b - a);
    return parseInt(sortedDays[0]);
  };

  const hourToSec = (hour) => {
    if (hour == '' || !hour) return 0;
    return parseInt(hour)*3600;
  };

  const minToSec = (min) => {
    if (min == '' || !min) return 0;
    return parseInt(min)*60;
  };

  const getSecond = (sec) => {
    if (sec == '' || !sec) return 0;
    return parseInt(sec);
  };

  const convertToSecond = (videoDuration) => {
    let durationParts = videoDuration
      .replace("PT", "")
      .replace("H", ":")
      .replace("M", ":")
      .replace("S", "")
      .split(":");
    console.log('durationParts', durationParts);
    switch (durationParts.length) {
      case 3:
        return hourToSec(durationParts[0]) + minToSec(durationParts[1]) + getSecond(durationParts[2]);
      case 2:
        return minToSec(durationParts[0]) + getSecond(durationParts[1]);
      case 1:
        return getSecond(durationParts[0]);
    }
  };
  
  const reset = () => {
    setDaysAmount(0);
    setDailyInSecond([]);
    setLongestDay(0);
    setFiveMost('');
    setVideoItems([]);
    setVideoIds([]);
  };

  const handleSubmit = () => {
    reset();
    // console.log(term);
    // console.log(daily.value);
    if (!daily || !daily.value) {
      alert('Informe o tempo de cada dia');
    }
    validateDaily(daily.value);
    if (term && term.value) {
      axios.get(searchUrl, {
        params: {
          key: apiKey,
          q: term.value,
          maxResults: maxResults,
          part: 'id,snippet',
          type: 'video'
        }
      }).then(response => {
        // console.log(response.data.items);
        if (response.data.items && response.data.items.length > 0) {
          extractVideoIds(response.data.items);
        }
      }).catch(err => {
        console.log(err);
        alert('Não foi possível pesquisar o texto informado');
      });
    } else {
      alert('Informe um texto para a pesquisa!');
    }
  };

  useEffect(() => {
    if (videoIds && videoIds.length > 0) {
      axios.get(videoUrl, {
        params: {
          key: apiKey,
          id: videoIds.toString(),
          maxResults: maxResults,
          part: 'id,snippet,contentDetails'
        }
      }).then(response => {
        if (response.data.items && response.data.items.length > 0) {
          setVideoItems(response.data.items);
        }
      }).catch(err => {
        console.log(err);
        alert('Não foi possível pesquisar o texto informado');
      });
    }
  }, [videoIds]);

  useEffect(() => {
    if (videoItems && videoItems.length > 0) {
      let myDiff = 0;
      let myCounter = 0;
      let myAmount = 0;
      console.log('longestDay', longestDay);
      videoItems.forEach(({ id, contentDetails = {} }, index, array) => {
        const { duration } = contentDetails;
        console.log('duration', duration);
        console.log('id', id);
        let result = setAmount(convertToSecond(duration), myCounter, myAmount, myDiff);
        myAmount = result[0];
        myDiff = result[1];
        myCounter = result[2] === 6 ? 0 : result[2];
        
        if (index === array.length-1) {
          console.log('daysAmount', myAmount);
          setDaysAmount(myAmount);
        }
      });
    }
  }, [videoItems]);

  const handleInputChange = event => {
    const { name, value } = event.target;
    setInputValues({ [name]: value });
  };

  const setAmount = (durationInSecond, myCounter, myAmount, myDiff) => {
    console.log('durationInSecond', durationInSecond);
    if (durationInSecond > longestDay) return [myAmount, myDiff, myCounter];
    if (myDiff <= 0) ++myAmount;
    
    let diff = (myDiff > 0 ? myDiff : dailyInSecond[myCounter]) - durationInSecond;
    console.log('myCounter', myCounter);
    console.log('dailyInSecond', dailyInSecond[myCounter]);
    console.log('diff', diff);
    console.log('myDiff', myDiff);
    console.log('myAmount', myAmount);

    if (diff > 0) return [myAmount, diff, myCounter];
    console.log('Contador precisa ser incrementado');
    if (diff === 0) return [myAmount, 0, ++myCounter];
    if (diff < 0) return setAmount(durationInSecond, ++myCounter, myAmount, 0);
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Ahgora test</title>
        <meta name="description" content="Youtube Data API" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Youtube Videos
        </h1>

        <div className={styles.grid}>
          <p>
            <input type="text" name="term" id="term" className={styles.formControl} onChange={handleInputChange} placeholder="Termo de pesquisa"></input>
          </p>
          <p>
            Informe em minutos e separado por vírgula o tempo disponível por dia na semana
            <br/>
            Exemplo: 15,120,30,150,20,40,90
          </p>
          <div>
            <input type="text" name="daily" id="daily" className={styles.formControl} onChange={handleInputChange} placeholder="Tempo em minutos e separado por vírgula"></input>
          </div>
          <p>
            <button onClick={handleSubmit}>Pesquisar</button>
          </p>
          {fiveMost && (<p>As cincos palavras mais usadas: {fiveMost}</p>)}
          {daysAmount > 0 && (<p>Dias necessários para ver todos os vídeos: {daysAmount} dia(s)</p>)}
          {videoItems && videoItems.length > 0 > 0 && (<p>Total de vídeos: {videoItems.length}</p>)}
        </div>

        <ul className={styles.grid}>
          {videoItems.map(({ id, snippet = {} }) => {
            const { title, description, thumbnails = {} } = snippet;
            const { medium } = thumbnails;

            return (
              <li key={id} className={styles.card}>
                <a href={`https://www.youtube.com/watch?v=${id}`} target='_blank' rel="noreferrer">
                  <p>
                    <Image width={medium.width} height={medium.height} src={medium.url} alt="My image" />
                  </p>
                  <h3>{ title }</h3>
                  <h5>{ description }</h5>
                </a>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
