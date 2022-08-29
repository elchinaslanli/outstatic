import { yupResolver } from '@hookform/resolvers/yup'
import matter from 'gray-matter'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { singular } from 'pluralize'
import { useContext, useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import {
  AdminLayout,
  MDEditor,
  PostSettings,
  PostTitleInput
} from '../../components'
import { OutstaticContext, PostContext } from '../../context'
import { useCreateCommitMutation, usePostQuery } from '../../graphql/generated'
import { PostType, FileType } from '../../types'
import { useOstSession } from '../../utils/auth/hooks'
import { createCommitInput } from '../../utils/createCommitInput'
import { getLocalDate } from '../../utils/getLocalDate'
import { mergeMdMeta } from '../../utils/mergeMdMeta'
import useNavigationLock from '../../utils/useNavigationLock'
import useOid from '../../utils/useOid'
import useTipTap from '../../utils/useTipTap'
import { editPostSchema } from '../../utils/yup'

type EditContentProps = {
  contentType: string
}

export default function EditContent({ contentType }: EditContentProps) {
  const router = useRouter()
  const slug = router.query?.ost?.[1] as string
  const { repoSlug, contentPath } = useContext(OutstaticContext)
  const { session } = useOstSession()
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [files, setFiles] = useState<FileType[]>([])
  const [createCommit] = useCreateCommitMutation()
  const fetchOid = useOid()
  const [showDelete, setShowDelete] = useState(false)
  const methods = useForm<PostType>({ resolver: yupResolver(editPostSchema) })
  const { editor } = useTipTap({ ...methods })

  const editPost = (property: string, value: any) => {
    const formValues = methods.getValues()
    const newValue = { ...formValues, [property]: value }
    methods.reset(newValue)
  }

  const { data: postQueryData } = usePostQuery({
    variables: {
      owner: session?.user?.name || '',
      name: repoSlug,
      filePath: `HEAD:${contentPath}/${contentType}/${slug}.md`
    },
    fetchPolicy: 'network-only',
    skip: slug === 'new' || !slug
  })

  const onSubmit = async (data: PostType) => {
    setLoading(true)
    try {
      const post = methods.getValues()
      const content = mergeMdMeta({ ...data })
      const oid = await fetchOid()
      const owner = session?.user?.name || ''
      const newSlug = post.slug

      // If the slug has changed, commit should delete old file
      const oldSlug = slug !== newSlug && slug !== 'new' ? slug : undefined

      const commitInput = createCommitInput({
        owner,
        slug: newSlug,
        oldSlug,
        content,
        oid,
        files,
        repoSlug,
        contentPath: contentPath + '/' + contentType
      })

      await createCommit({ variables: commitInput })
      setLoading(false)
      setHasChanges(false)
      window.history.replaceState('', '', `/outstatic/posts/${newSlug}`)
      setShowDelete(true)
    } catch (error) {
      // TODO: Better error treatment
      setLoading(false)
      console.log({ error })
    }
  }

  useEffect(() => {
    const postQueryObject = postQueryData?.repository?.object

    if (postQueryObject?.__typename === 'Blob') {
      let mdContent = postQueryObject.text as string
      const {
        data: { title, publishedAt, status, description },
        content
      } = matter(mdContent)

      const parseContent = () => {
        const blogUrl = process.env.VERCEL_URL ? '' : '/api/outstatic'
        const newContent = content?.replace(
          'src="/images/',
          `src="${blogUrl}/images/`
        )
        return newContent
      }

      const newDate = publishedAt ? new Date(publishedAt) : getLocalDate()
      const post = {
        title,
        publishedAt: newDate,
        content: parseContent(),
        status,
        slug,
        description
      }
      methods.reset(post)
      editor.commands.insertContent(parseContent())
      editor.commands.focus('start')
      setShowDelete(slug !== 'new')
    } else {
      // Set publishedAt value on slug update to avoid undefined on first render
      if (slug) {
        const formData = methods.getValues()
        methods.reset({
          ...formData,
          publishedAt: slug === 'new' ? getLocalDate() : formData.publishedAt
        })
      }
    }

    const subscription = methods.watch(() => setHasChanges(true))

    return () => subscription.unsubscribe()
  }, [postQueryData, methods, slug, editor])

  // Ask for confirmation before leaving page if changes were made.
  useNavigationLock(hasChanges)

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="true"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font*/}
        <link
          href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,500;0,600;0,700;1,400;1,500;1,600;1,700&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </Head>
      <PostContext.Provider
        value={{
          editor,
          post: methods.getValues(),
          editPost,
          files,
          setFiles,
          hasChanges,
          contentType
        }}
      >
        <FormProvider {...methods}>
          <AdminLayout
            settings={
              <PostSettings
                loading={loading}
                saveFunc={methods.handleSubmit(onSubmit)}
                showDelete={showDelete}
              />
            }
          >
            <form className="m-auto max-w-[700px] space-y-4">
              <PostTitleInput
                id="title"
                className="w-full resize-none outline-none bg-white text-5xl"
                placeholder={`Your ${singular(contentType)} title`}
              />
              <div className="min-h-full">
                <MDEditor editor={editor} id="content" />
              </div>
            </form>
          </AdminLayout>
        </FormProvider>
      </PostContext.Provider>
    </>
  )
}