<template>

    <div class="bountyPage">

        <div class="bountySide">

            <div class="bountyCampaigns">
                <span @click="this.handleChangeToYoutube" :class="this.type==='youtube' ? 'selectedCampaign' : ''">
                    <i class="fa fa-youtube2"></i>
                </span>
                <!--<span @click="this.handleChangeToFacebook" :class="this.type==='facebook' ? 'selectedCampaign' : ''">-->
                    <!--<i class="fa fa-facebook2"></i>-->
                <!--</span>-->
                <span @click="this.handleChangeToInstagram" :class="this.type==='instagram' ? 'selectedCampaign' : ''">
                    <i class="fa fa-instagram"></i>
                </span>
                <span @click="this.handleChangeToTwitter" :class="this.type==='twitter' ? 'selectedCampaign' : ''">
                    <i class="fa fa-twitter"></i>
                </span>
                <span @click="this.handleChangeToTelegramWebDollar" :class="this.type==='telegram' ? 'selectedCampaign' : ''">
                    <i class="fa fa-telegram"></i>
                </span>
                <span @click="this.handleChangeToTelegramWebDollarRO" :class="this.type==='telegram RO' ? 'selectedCampaign' : ''">
                    <i class="fa fa-telegram"></i>
                </span>
                <span @click="this.handleChangeToReddit" :class="this.type==='reddit' ? 'selectedCampaign' : ''">
                    <i class="fa fa-reddit-alien"></i>
                </span>
                <!--<span @click="this.handleChangeToWebsite" :class="this.type==='website' ? 'selectedCampaign' : ''">-->
                    <!--<i class="fa fa-earth"></i>-->
                <!--</span>-->
            </div>


        </div>
        <div class="bountyMain">

            <div class="bountySideScroll">
                <div class="error" v-html="this.error"></div>
                <info-link  class="infoLink" :type="this.type" :onLinkSubmitted="this.linkSubmitted"> </info-link>
            </div>

            <facebook-ranking-list v-if="this.type === 'facebook'" :list="this.sortedArray" :type="this.type" :fetchingList="this.fetchingList"></facebook-ranking-list>
            <youtube-ranking-list v-if="this.type === 'youtube'" :list="this.sortedArray" :type="this.type" :fetchingList="this.fetchingList"></youtube-ranking-list>
            <instagram-ranking-list v-if="this.type === 'instagram'" :list="this.sortedArray" :type="this.type" :fetchingList="this.fetchingList"></instagram-ranking-list>
            <twitter-ranking-list v-if="this.type === 'twitter'" :list="this.sortedArray" :type="this.type" :fetchingList="this.fetchingList"></twitter-ranking-list>
            <telegram-ranking-list v-if="this.type === 'telegram'" :list="this.sortedArray" :type="this.type" :fetchingList="this.fetchingList"></telegram-ranking-list>
            <telegram-ranking-list v-if="this.type === 'telegram RO'" :list="this.sortedArray" :type="this.type" :fetchingList="this.fetchingList"></telegram-ranking-list>
            <reddit-ranking-list v-if="this.type === 'reddit'" :list="this.sortedArray" :type="this.type" :fetchingList="this.fetchingList"></reddit-ranking-list>
            <website-ranking-list v-if="this.type === 'website'" :list="this.sortedArray" :type="this.type" :fetchingList="this.fetchingList"></website-ranking-list>

        </div>

    </div>

</template>

<script>

    import RedditRankingList from "./lists/Reddit-Ranking-List.vue"
    import InstagramRankingList from "./lists/Instagram-Ranking-List.vue"
    import YoutubeRankingList from "./lists/Youtube-Ranking-List.vue"
    import FacebookRankingList from "./lists/Facebook-Ranking-List.vue"
    import TwitterRankingList from "./lists/Twitter-Ranking-List.vue"
    import TelegramRankingList from "./lists/Telegram-Ranking-List.vue"
    import WebsiteRankingList from "./lists/Telegram-Ranking-List.vue"

    import InfoLink from "./Info.form.vue"
    import consts from "consts/constants";
    import Vue from 'vue'
    let axios = require('axios');

    export default{

        data: () => {
            return {
                type: 'youtube',
                error: '',
                list: {},
                page:0,
                fetchingList: true
            }
        },

        components:{
            YoutubeRankingList,
            FacebookRankingList,
            TwitterRankingList,
            TelegramRankingList,
            WebsiteRankingList,
            InstagramRankingList,
            RedditRankingList,
            InfoLink
        },

        methods:{

            async downloadList(page=0){

                if (page === undefined)
                    page = 0;

                this.fetchingList = true;

                let answer = await axios.get(consts.SERVER_API+"get-ranking/"+this.type+"/"+page);

                answer = answer.data;

                if (answer.result){

                    this.fetchingList = false;

                    for (let i=0; i<answer.data.length; i++)
                        Vue.set(this.list, answer.data[i].id, answer.data[i])

                    this.error = '';
                } else {
                    this.error = answer.message;
                }

            },

            handleChangeType(type){

                if (this.type !== type){

                    this.type = type;
                    this.page = 0;
                    this.list = {};

                    this.downloadList(this.page);
                }

            },

            handleChangeToReddit(){ this.handleChangeType('reddit')},
            handleChangeToInstagram(){ this.handleChangeType('instagram')},
            handleChangeToYoutube(){ this.handleChangeType('youtube')},
            handleChangeToFacebook(){ this.handleChangeType('facebook')},
            handleChangeToTwitter(){ this.handleChangeType('twitter')},
            handleChangeToTelegramWebDollar(){ this.handleChangeType('telegram')},
            handleChangeToTelegramWebDollarRO(){ this.handleChangeType('telegram RO')},
            handleChangeToWebsite(){ this.handleChangeType('website')},

            linkSubmitted (link){
                Vue.set(this.list, link.id, link);
            },

            async fetchNewData(){

                await this.downloadList(this.page);

                this.$store.dispatch('BOUNTY_COUNT_DOWN_FETCHING_NEW_LIST', {bountyCountDownDate: new Date().getTime() + 30*1000 })

                setTimeout( async ()=>{
                    await this.fetchNewData();
                }, 30*1000);

            }
        },

        mounted(){

            if (typeof window === "undefined") return false;

            this.fetchNewData();

        },


        computed: {
            sortedArray: function() {

                function compare(a, b) {
                    return - (a.score - b.score);
                }

                let sortable = [];
                for (let list in this.list)
                    sortable.push(this.list[list]);

                return sortable.sort(compare);
            }
        },

    }
</script>

<style>

    .error{
        color:red;
    }

</style>